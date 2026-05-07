import { Injectable } from '@nestjs/common';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { DashboardOverviewResponse } from '../dto/analytics-response.dto';
import { GetMessageVolumeUseCase } from './get-message-volume.use-case';
import { GetResponseTimeUseCase } from './get-response-time.use-case';
import { GetConversionFunnelUseCase } from './get-conversion-funnel.use-case';
import { GetPeakHoursUseCase } from './get-peak-hours.use-case';
import { GetCampaignSummaryUseCase } from './get-campaign-summary.use-case';

@Injectable()
export class GetDashboardOverviewUseCase {
  constructor(
    private readonly messageVolumeUseCase: GetMessageVolumeUseCase,
    private readonly responseTimeUseCase: GetResponseTimeUseCase,
    private readonly conversionFunnelUseCase: GetConversionFunnelUseCase,
    private readonly peakHoursUseCase: GetPeakHoursUseCase,
    private readonly campaignSummaryUseCase: GetCampaignSummaryUseCase,
  ) {}

  async execute(
    orgId: string,
    role: string,
    requesterId: string,
    query: AnalyticsQueryDto,
  ): Promise<DashboardOverviewResponse> {
    const [messageVolume, responseTime, conversionFunnel, peakHours, campaignSummary] =
      await Promise.all([
        this.messageVolumeUseCase.execute(orgId, role, requesterId, query),
        this.responseTimeUseCase.execute(orgId, role, requesterId, query),
        this.conversionFunnelUseCase.execute(orgId, query),
        this.peakHoursUseCase.execute(orgId, query),
        this.campaignSummaryUseCase.execute(orgId, query),
      ]);

    return {
      messageVolume,
      responseTime,
      conversionFunnel,
      peakHours,
      campaignSummary,
    };
  }
}
