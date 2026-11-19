import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from '../../infrastructure/repositories/analytics.repository';
import { AnalyticsScopeService } from '../../domain/services/analytics-scope.service';
import {
  buildLiveChannelStats,
  startOfLocalDay,
} from '../../domain/services/live-channel-stats';
import { LiveChannelsQueryDto } from '../dto/analytics-query.dto';
import { LiveChannelStatsResponse } from '../dto/analytics-response.dto';

/** Messages today, per channel — feeds the Message City 3D dashboard. */
@Injectable()
export class GetLiveChannelStatsUseCase {
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
  ): Promise<LiveChannelStatsResponse> {
    const offsetMinutes = query.timezoneOffsetMinutes ?? (query.timezoneOffsetHours ?? 0) * 60;
    const since = startOfLocalDay(now, offsetMinutes);
    const { userIds } = await this.scopeService.resolveScope(orgId, role, requesterId);

    const [messages, widget, email, inbox] = await Promise.all([
      this.analyticsRepo.getLiveMessageCountsByChannel(orgId, since, userIds),
      this.analyticsRepo.getLiveWidgetMessageCounts(orgId, since, userIds),
      // Emails come from campaigns/automations, not a person — org-wide view only
      userIds ? Promise.resolve([]) : this.analyticsRepo.getLiveEmailCounts(orgId, since),
      this.analyticsRepo.getInboxSummary(orgId, userIds),
    ]);

    return {
      asOf: now.toISOString(),
      since: since.toISOString(),
      channels: buildLiveChannelStats({ messages, widget, email }),
      openConversations: inbox.openConversations,
      unread: inbox.unread,
    };
  }
}
