import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from '../../infrastructure/repositories/analytics.repository';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { ConversionFunnelResponse } from '../dto/analytics-response.dto';
import { resolveRange } from './date-range.helper';

@Injectable()
export class GetConversionFunnelUseCase {
  constructor(private readonly analyticsRepo: AnalyticsRepository) {}

  async execute(
    orgId: string,
    query: AnalyticsQueryDto,
  ): Promise<ConversionFunnelResponse> {
    const { startDate, endDate } = resolveRange(query);

    const [statusCounts, conversionSeries] = await Promise.all([
      this.analyticsRepo.getCurrentLeadStatusCounts(orgId),
      this.analyticsRepo.getConversionDailySeries(orgId, startDate, endDate),
    ]);

    // Build snapshot from live counts
    const snapshot = {
      new: 0,
      contacted: 0,
      interested: 0,
      converted: 0,
      closed: 0,
      total: 0,
    };

    for (const row of statusCounts) {
      const key = row.leadStatus.toLowerCase() as keyof typeof snapshot;
      if (key in snapshot && key !== 'total') {
        snapshot[key] = row.count;
      }
    }
    snapshot.total =
      snapshot.new +
      snapshot.contacted +
      snapshot.interested +
      snapshot.converted +
      snapshot.closed;

    // Compute rates (avoid division by zero)
    const total = snapshot.total || 1;
    const rates = {
      contactedRate: parseFloat(((snapshot.contacted / total) * 100).toFixed(2)),
      interestedRate: parseFloat(
        ((snapshot.interested / total) * 100).toFixed(2),
      ),
      conversionRate: parseFloat(
        ((snapshot.converted / total) * 100).toFixed(2),
      ),
      closedRate: parseFloat(((snapshot.closed / total) * 100).toFixed(2)),
    };

    // Aggregate transitions from pre-computed daily snapshots
    const transitionTotals = new Map<string, number>();
    for (const day of conversionSeries) {
      const json = day.transitionsJson as Record<string, number>;
      for (const [key, count] of Object.entries(json)) {
        transitionTotals.set(
          key,
          (transitionTotals.get(key) ?? 0) + count,
        );
      }
    }

    const transitions = Array.from(transitionTotals.entries()).map(
      ([key, count]) => {
        const [from, to] = key.split('_TO_');
        return { from, to, count };
      },
    );

    return { snapshot, rates, transitions };
  }
}
