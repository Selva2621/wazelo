import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from '../../infrastructure/repositories/analytics.repository';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { PeakHoursResponse } from '../dto/analytics-response.dto';
import { resolveRange } from './date-range.helper';

@Injectable()
export class GetPeakHoursUseCase {
  constructor(private readonly analyticsRepo: AnalyticsRepository) {}

  async execute(
    orgId: string,
    query: AnalyticsQueryDto,
  ): Promise<PeakHoursResponse> {
    const { startDate, endDate } = resolveRange(query);

    const rows = await this.analyticsRepo.getMessageHourlySeries(
      orgId,
      startDate,
      endDate,
    );

    // Bucket by hour-of-day (0-23)
    const hourBuckets: {
      inbound: number;
      outbound: number;
    }[] = Array.from({ length: 24 }, () => ({ inbound: 0, outbound: 0 }));

    for (const row of rows) {
      const hour = row.hour.getUTCHours();
      hourBuckets[hour].inbound += row.inboundCount;
      hourBuckets[hour].outbound += row.outboundCount;
    }

    const hours = hourBuckets.map((bucket, hour) => ({
      hour,
      inbound: bucket.inbound,
      outbound: bucket.outbound,
      total: bucket.inbound + bucket.outbound,
    }));

    let peakHour = 0;
    let quietHour = 0;
    let maxTotal = -1;
    let minTotal = Infinity;

    for (const h of hours) {
      if (h.total > maxTotal) {
        maxTotal = h.total;
        peakHour = h.hour;
      }
      if (h.total < minTotal) {
        minTotal = h.total;
        quietHour = h.hour;
      }
    }

    return { hours, peakHour, quietHour };
  }
}
