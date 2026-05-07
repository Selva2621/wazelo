import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from '../../infrastructure/repositories/analytics.repository';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { CampaignSummaryResponse } from '../dto/analytics-response.dto';
import { resolveRange } from './date-range.helper';

@Injectable()
export class GetCampaignSummaryUseCase {
  constructor(private readonly analyticsRepo: AnalyticsRepository) {}

  async execute(
    orgId: string,
    query: AnalyticsQueryDto,
  ): Promise<CampaignSummaryResponse> {
    const { startDate, endDate } = resolveRange(query);

    const rows = await this.analyticsRepo.getCampaignSummarySeries(
      orgId,
      startDate,
      endDate,
    );

    const series = rows.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      campaigns: row.totalCampaigns,
      recipients: row.totalRecipients,
      sent: row.totalSent,
      delivered: row.totalDelivered,
      failed: row.totalFailed,
      read: row.totalRead,
    }));

    const totals = {
      totalCampaigns: 0,
      completedCampaigns: 0,
      totalRecipients: 0,
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      totalRead: 0,
      avgDeliveryRate: 0,
      avgReadRate: 0,
    };

    for (const row of rows) {
      totals.totalCampaigns += row.totalCampaigns;
      totals.completedCampaigns += row.completedCampaigns;
      totals.totalRecipients += row.totalRecipients;
      totals.totalSent += row.totalSent;
      totals.totalDelivered += row.totalDelivered;
      totals.totalFailed += row.totalFailed;
      totals.totalRead += row.totalRead;
    }

    totals.avgDeliveryRate =
      totals.totalRecipients > 0
        ? parseFloat(
            ((totals.totalDelivered / totals.totalRecipients) * 100).toFixed(2),
          )
        : 0;

    totals.avgReadRate =
      totals.totalDelivered > 0
        ? parseFloat(
            ((totals.totalRead / totals.totalDelivered) * 100).toFixed(2),
          )
        : 0;

    return { series, totals };
  }
}
