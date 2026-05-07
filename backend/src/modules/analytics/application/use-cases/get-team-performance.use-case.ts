import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from '../../infrastructure/repositories/analytics.repository';
import { AnalyticsScopeService } from '../../domain/services/analytics-scope.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { TeamPerformanceResponse } from '../dto/analytics-response.dto';
import { resolveRange } from './date-range.helper';

@Injectable()
export class GetTeamPerformanceUseCase {
  constructor(
    private readonly analyticsRepo: AnalyticsRepository,
    private readonly scopeService: AnalyticsScopeService,
  ) {}

  async execute(
    orgId: string,
    role: string,
    requesterId: string,
    query: AnalyticsQueryDto,
  ): Promise<TeamPerformanceResponse> {
    const { startDate, endDate } = resolveRange(query);
    const scope = await this.scopeService.resolveScope(
      orgId,
      role,
      requesterId,
      query.userId,
    );

    const [messageDailyRows, responseTimeRows, conversions, activeConversations, users] =
      await Promise.all([
        this.analyticsRepo.getMessageDailySeries(orgId, startDate, endDate, scope.userIds),
        this.analyticsRepo.getResponseTimeSeries(orgId, startDate, endDate, scope.userIds),
        this.analyticsRepo.getContactsConvertedByUser(orgId, startDate, endDate, scope.userIds),
        this.analyticsRepo.getActiveConversationsByUser(orgId, scope.userIds),
        this.analyticsRepo.getUsersByIds(orgId, scope.userIds),
      ]);

    // Aggregate messages per user
    const userMessageMap = new Map<string, { sent: number; received: number }>();
    for (const row of messageDailyRows) {
      if (!row.userId) continue;
      const existing = userMessageMap.get(row.userId) ?? { sent: 0, received: 0 };
      existing.sent += row.outboundCount;
      existing.received += row.inboundCount;
      userMessageMap.set(row.userId, existing);
    }

    // Aggregate response time per user
    const userResponseMap = new Map<string, { totalMs: bigint; count: number }>();
    for (const row of responseTimeRows) {
      if (!row.userId) continue;
      const existing = userResponseMap.get(row.userId) ?? {
        totalMs: BigInt(0),
        count: 0,
      };
      existing.totalMs += row.totalResponseTimeMs;
      existing.count += row.responseCount;
      userResponseMap.set(row.userId, existing);
    }

    // Conversions per user
    const conversionMap = new Map<string, number>();
    for (const c of conversions) {
      conversionMap.set(c.changedById, c.count);
    }

    // Active conversations per user
    const activeConvMap = new Map<string, number>();
    for (const ac of activeConversations) {
      activeConvMap.set(ac.assignedToId, ac.count);
    }

    const result: TeamPerformanceResponse = {
      users: users.map((user) => {
        const msgs = userMessageMap.get(user.id);
        const resp = userResponseMap.get(user.id);
        return {
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          messagesSent: msgs?.sent ?? 0,
          messagesReceived: msgs?.received ?? 0,
          avgResponseTimeMs:
            resp && resp.count > 0
              ? Number(resp.totalMs / BigInt(resp.count))
              : null,
          contactsConverted: conversionMap.get(user.id) ?? 0,
          activeConversations: activeConvMap.get(user.id) ?? 0,
        };
      }),
    };

    return result;
  }
}
