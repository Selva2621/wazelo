import { Injectable, BadRequestException } from '@nestjs/common';
import { AnalyticsRepository } from '../../infrastructure/repositories/analytics.repository';
import { AnalyticsScopeService } from '../../domain/services/analytics-scope.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { MessageVolumeResponse } from '../dto/analytics-response.dto';
import { resolveRange } from './date-range.helper';

@Injectable()
export class GetMessageVolumeUseCase {
  constructor(
    private readonly analyticsRepo: AnalyticsRepository,
    private readonly scopeService: AnalyticsScopeService,
  ) {}

  async execute(
    orgId: string,
    role: string,
    requesterId: string,
    query: AnalyticsQueryDto,
  ): Promise<MessageVolumeResponse> {
    const { startDate, endDate } = resolveRange(query);
    const scope = await this.scopeService.resolveScope(
      orgId,
      role,
      requesterId,
      query.userId,
    );

    const rows = await this.analyticsRepo.getMessageDailySeries(
      orgId,
      startDate,
      endDate,
      scope.userIds,
    );

    // Aggregate by date (multiple users may exist per date)
    const dateMap = new Map<
      string,
      {
        inbound: number;
        outbound: number;
        sent: number;
        delivered: number;
        read: number;
        failed: number;
      }
    >();

    for (const row of rows) {
      const key = row.date.toISOString().slice(0, 10);
      const existing = dateMap.get(key) ?? {
        inbound: 0,
        outbound: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
      };
      existing.inbound += row.inboundCount;
      existing.outbound += row.outboundCount;
      existing.sent += row.sentCount;
      existing.delivered += row.deliveredCount;
      existing.read += row.readCount;
      existing.failed += row.failedCount;
      dateMap.set(key, existing);
    }

    const series = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      inbound: data.inbound,
      outbound: data.outbound,
      total: data.inbound + data.outbound,
    }));

    const totals = {
      inbound: 0,
      outbound: 0,
      total: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };

    for (const data of dateMap.values()) {
      totals.inbound += data.inbound;
      totals.outbound += data.outbound;
      totals.sent += data.sent;
      totals.delivered += data.delivered;
      totals.read += data.read;
      totals.failed += data.failed;
    }
    totals.total = totals.inbound + totals.outbound;

    return { series, totals };
  }
}
