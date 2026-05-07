import { Module } from '@nestjs/common';
import { TeamsModule } from '@/modules/teams/teams.module';

// Repositories
import { AnalyticsRepository } from './infrastructure/repositories/analytics.repository';
import { AnalyticsAggregationRepository } from './infrastructure/repositories/analytics-aggregation.repository';

// Domain services
import { AnalyticsScopeService } from './domain/services/analytics-scope.service';

// Use cases
import { GetMessageVolumeUseCase } from './application/use-cases/get-message-volume.use-case';
import { GetResponseTimeUseCase } from './application/use-cases/get-response-time.use-case';
import { GetConversionFunnelUseCase } from './application/use-cases/get-conversion-funnel.use-case';
import { GetPeakHoursUseCase } from './application/use-cases/get-peak-hours.use-case';
import { GetTeamPerformanceUseCase } from './application/use-cases/get-team-performance.use-case';
import { GetCampaignSummaryUseCase } from './application/use-cases/get-campaign-summary.use-case';
import { GetDashboardOverviewUseCase } from './application/use-cases/get-dashboard-overview.use-case';
import { ExportAnalyticsUseCase } from './application/use-cases/export-analytics.use-case';

// Controller
import { AnalyticsController } from './interfaces/controllers/analytics.controller';

@Module({
  imports: [TeamsModule],
  controllers: [AnalyticsController],
  providers: [
    // Repositories
    AnalyticsRepository,
    AnalyticsAggregationRepository,

    // Domain services
    AnalyticsScopeService,

    // Use cases
    GetMessageVolumeUseCase,
    GetResponseTimeUseCase,
    GetConversionFunnelUseCase,
    GetPeakHoursUseCase,
    GetTeamPerformanceUseCase,
    GetCampaignSummaryUseCase,
    GetDashboardOverviewUseCase,
    ExportAnalyticsUseCase,
  ],
  exports: [AnalyticsRepository, AnalyticsAggregationRepository, AnalyticsScopeService],
})
export class AnalyticsModule {}
