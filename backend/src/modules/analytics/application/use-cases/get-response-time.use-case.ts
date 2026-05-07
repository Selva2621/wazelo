import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from '../../infrastructure/repositories/analytics.repository';
import { AnalyticsScopeService } from '../../domain/services/analytics-scope.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { ResponseTimeResponse } from '../dto/analytics-response.dto';
import { resolveRange } from './date-range.helper';

@Injectable()
export class GetResponseTimeUseCase {
  constructor(
    private readonly analyticsRepo: AnalyticsRepository,
    private readonly scopeService: AnalyticsScopeService,
  ) {}

  async execute(
    orgId: string,
    role: string,
    requesterId: string,
    query: AnalyticsQueryDto,
  ): Promise<ResponseTimeResponse> {
    const { startDate, endDate } = resolveRange(query);
    const scope = await this.scopeService.resolveScope(
      orgId,
      role,
      requesterId,
      query.userId,
    );

    const rows = await this.analyticsRepo.getResponseTimeSeries(
      orgId,
      startDate,
      endDate,
      scope.userIds,
    );

    // Aggregate by date
    const dateMap = new Map<
      string,
      {
        totalMs: bigint;
        count: number;
        minMs: number | null;
        maxMs: number | null;
        p50Ms: number | null;
        p95Ms: number | null;
      }
    >();

    for (const row of rows) {
      const key = row.date.toISOString().slice(0, 10);
      const existing = dateMap.get(key);
      if (!existing) {
        dateMap.set(key, {
          totalMs: row.totalResponseTimeMs,
          count: row.responseCount,
          minMs: row.minResponseTimeMs,
          maxMs: row.maxResponseTimeMs,
          p50Ms: row.p50ResponseTimeMs,
          p95Ms: row.p95ResponseTimeMs,
        });
      } else {
        existing.totalMs += row.totalResponseTimeMs;
        existing.count += row.responseCount;
        if (row.minResponseTimeMs !== null) {
          existing.minMs =
            existing.minMs === null
              ? row.minResponseTimeMs
              : Math.min(existing.minMs, row.minResponseTimeMs);
        }
        if (row.maxResponseTimeMs !== null) {
          existing.maxMs =
            existing.maxMs === null
              ? row.maxResponseTimeMs
              : Math.max(existing.maxMs, row.maxResponseTimeMs);
        }
      }
    }

    const series = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      avgResponseTimeMs:
        data.count > 0 ? Number(data.totalMs / BigInt(data.count)) : 0,
      p50ResponseTimeMs: data.p50Ms,
      p95ResponseTimeMs: data.p95Ms,
      responseCount: data.count,
    }));

    // Compute overall
    let totalMs = BigInt(0);
    let totalCount = 0;
    let overallMin: number | null = null;
    let overallMax: number | null = null;

    for (const data of dateMap.values()) {
      totalMs += data.totalMs;
      totalCount += data.count;
      if (data.minMs !== null) {
        overallMin =
          overallMin === null ? data.minMs : Math.min(overallMin, data.minMs);
      }
      if (data.maxMs !== null) {
        overallMax =
          overallMax === null ? data.maxMs : Math.max(overallMax, data.maxMs);
      }
    }

    return {
      series,
      overall: {
        avgResponseTimeMs:
          totalCount > 0 ? Number(totalMs / BigInt(totalCount)) : null,
        minResponseTimeMs: overallMin,
        maxResponseTimeMs: overallMax,
        totalResponses: totalCount,
      },
    };
  }
}
