import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from '../../infrastructure/repositories/analytics.repository';
import { AnalyticsScopeService } from '../../domain/services/analytics-scope.service';
import { startOfLocalDay } from '../../domain/services/live-channel-stats';
import { leadOrigin, summarizeRevenue, waitingMinutes } from '../../domain/services/dashboard-live';
import { buildCityInsights, type CityInsights } from '../../domain/services/city-insights';
import { LiveChannelsQueryDto, LiveWaitingQueryDto } from '../dto/analytics-query.dto';
import {
  LiveLeadsResponse,
  LiveRevenueResponse,
  LiveWaitingResponse,
} from '../dto/analytics-response.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Chats where the customer is waiting for a reply (dashboard alert) */
@Injectable()
export class GetWaitingChatsUseCase {
  constructor(
    private readonly analyticsRepo: AnalyticsRepository,
    private readonly scopeService: AnalyticsScopeService,
  ) {}

  async execute(
    orgId: string,
    role: string,
    requesterId: string,
    query: LiveWaitingQueryDto,
    now: Date = new Date(),
  ): Promise<LiveWaitingResponse> {
    const minMinutes = query.minMinutes ?? 15;
    const { userIds } = await this.scopeService.resolveScope(orgId, role, requesterId);
    const cutoff = new Date(now.getTime() - minMinutes * 60_000);
    const { total, rows } = await this.analyticsRepo.getWaitingConversations(orgId, cutoff, userIds, 6);

    return {
      minMinutes,
      total,
      items: rows.map((r) => ({
        conversationId: r.conversationId,
        contactId: r.contactId,
        name: r.contactName,
        phone: r.contactPhone,
        channelType: r.channelType ?? 'WHATSAPP',
        waitingMinutes: waitingMinutes(r.waitingSince, now),
        assignee: r.assignedToId
          ? {
              id: r.assignedToId,
              name: [r.assigneeFirstName, r.assigneeLastName].filter(Boolean).join(' ') || 'Teammate',
            }
          : null,
      })),
    };
  }
}

/** Pipeline value, deals won and proposals for the last 7 days (dashboard money strip) */
@Injectable()
export class GetRevenueSnapshotUseCase {
  constructor(
    private readonly analyticsRepo: AnalyticsRepository,
    private readonly scopeService: AnalyticsScopeService,
  ) {}

  async execute(
    orgId: string,
    role: string,
    requesterId: string,
    now: Date = new Date(),
  ): Promise<LiveRevenueResponse> {
    const { userIds } = await this.scopeService.resolveScope(orgId, role, requesterId);
    const since = new Date(now.getTime() - 7 * DAY_MS);
    const snap = await this.analyticsRepo.getRevenueSnapshot(orgId, since, userIds);
    return {
      since: since.toISOString(),
      ...summarizeRevenue(snap.open, snap.won),
      proposalsSent: snap.proposalsSent,
      proposalsViewed: snap.proposalsViewed,
    };
  }
}

/** Message City insights: messages per hour (today vs yesterday) and reply speed per channel */
@Injectable()
export class GetCityInsightsUseCase {
  constructor(
    private readonly analyticsRepo: AnalyticsRepository,
    private readonly scopeService: AnalyticsScopeService,
  ) {}

  async execute(
    orgId: string,
    role: string,
    requesterId: string,
    query: LiveChannelsQueryDto,
    now: Date = new Date(),
  ): Promise<CityInsights> {
    const offsetMinutes = query.timezoneOffsetMinutes ?? (query.timezoneOffsetHours ?? 0) * 60;
    const todayStart = startOfLocalDay(now, offsetMinutes);
    const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
    const tomorrowStart = new Date(todayStart.getTime() + DAY_MS);
    const { userIds } = await this.scopeService.resolveScope(orgId, role, requesterId);

    const [messages, widget, replies] = await Promise.all([
      this.analyticsRepo.getHourlyMessageCounts(orgId, yesterdayStart, tomorrowStart, offsetMinutes, userIds),
      this.analyticsRepo.getHourlyWidgetCounts(orgId, yesterdayStart, tomorrowStart, offsetMinutes, userIds),
      this.analyticsRepo.getReplyTimes(orgId, todayStart, yesterdayStart, userIds),
    ]);

    return buildCityInsights({ messages, widget, replies, todayStart, offsetMinutes, now });
  }
}

/** Leads created today (Message City's loading dock) */
@Injectable()
export class GetLeadsTodayUseCase {
  constructor(
    private readonly analyticsRepo: AnalyticsRepository,
    private readonly scopeService: AnalyticsScopeService,
  ) {}

  async execute(
    orgId: string,
    role: string,
    requesterId: string,
    query: LiveChannelsQueryDto,
    now: Date = new Date(),
  ): Promise<LiveLeadsResponse> {
    const offsetMinutes = query.timezoneOffsetMinutes ?? (query.timezoneOffsetHours ?? 0) * 60;
    const since = startOfLocalDay(now, offsetMinutes);
    const { userIds } = await this.scopeService.resolveScope(orgId, role, requesterId);
    const { total, rows } = await this.analyticsRepo.getLeadsSince(orgId, since, userIds, 8);
    return {
      since: since.toISOString(),
      total,
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phoneNumber,
        origin: leadOrigin(r.source),
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}
