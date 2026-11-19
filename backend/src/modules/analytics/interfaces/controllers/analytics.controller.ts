import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { QUEUE_NAMES, ANALYTICS_CONFIG } from '@/common/constants';
import { AnalyticsQueryDto, BackfillDto } from '../../application/dto/analytics-query.dto';
import { GetMessageVolumeUseCase } from '../../application/use-cases/get-message-volume.use-case';
import { GetResponseTimeUseCase } from '../../application/use-cases/get-response-time.use-case';
import { GetConversionFunnelUseCase } from '../../application/use-cases/get-conversion-funnel.use-case';
import { GetPeakHoursUseCase } from '../../application/use-cases/get-peak-hours.use-case';
import { GetTeamPerformanceUseCase } from '../../application/use-cases/get-team-performance.use-case';
import { GetCampaignSummaryUseCase } from '../../application/use-cases/get-campaign-summary.use-case';
import { GetDashboardOverviewUseCase } from '../../application/use-cases/get-dashboard-overview.use-case';
import { ExportAnalyticsUseCase } from '../../application/use-cases/export-analytics.use-case';
import { GetLiveChannelStatsUseCase } from '../../application/use-cases/get-live-channel-stats.use-case';
import { LiveChannelsQueryDto, LiveWaitingQueryDto } from '../../application/dto/analytics-query.dto';
import {
  GetCityInsightsUseCase,
  GetLeadsTodayUseCase,
  GetRevenueSnapshotUseCase,
  GetWaitingChatsUseCase,
} from '../../application/use-cases/get-live-dashboard.use-cases';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly getMessageVolumeUseCase: GetMessageVolumeUseCase,
    private readonly getResponseTimeUseCase: GetResponseTimeUseCase,
    private readonly getConversionFunnelUseCase: GetConversionFunnelUseCase,
    private readonly getPeakHoursUseCase: GetPeakHoursUseCase,
    private readonly getTeamPerformanceUseCase: GetTeamPerformanceUseCase,
    private readonly getCampaignSummaryUseCase: GetCampaignSummaryUseCase,
    private readonly getDashboardOverviewUseCase: GetDashboardOverviewUseCase,
    private readonly exportAnalyticsUseCase: ExportAnalyticsUseCase,
    private readonly getLiveChannelStatsUseCase: GetLiveChannelStatsUseCase,
    private readonly getWaitingChatsUseCase: GetWaitingChatsUseCase,
    private readonly getRevenueSnapshotUseCase: GetRevenueSnapshotUseCase,
    private readonly getLeadsTodayUseCase: GetLeadsTodayUseCase,
    private readonly getCityInsightsUseCase: GetCityInsightsUseCase,
    private readonly queueService: QueueService,
  ) {}

  /**
   * GET /analytics/live/city-insights
   * Messages per local hour (today vs yesterday) and average reply time per channel.
   */
  @Get('live/city-insights')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  async getCityInsights(@Query() query: LiveChannelsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.getCityInsightsUseCase.execute(user.orgId, user.role, user.sub, query);
  }

  /**
   * GET /analytics/live/waiting
   * Open chats whose last message is from the customer, waiting ≥ minMinutes.
   */
  @Get('live/waiting')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  async getWaitingChats(@Query() query: LiveWaitingQueryDto, @CurrentUser() user: JwtPayload) {
    return this.getWaitingChatsUseCase.execute(user.orgId, user.role, user.sub, query);
  }

  /**
   * GET /analytics/live/revenue
   * Pipeline value, deals won and proposals sent/viewed in the last 7 days.
   */
  @Get('live/revenue')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  async getRevenueSnapshot(@CurrentUser() user: JwtPayload) {
    return this.getRevenueSnapshotUseCase.execute(user.orgId, user.role, user.sub);
  }

  /**
   * GET /analytics/live/leads
   * Leads created today and the newest few (Message City's loading dock).
   */
  @Get('live/leads')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  async getLeadsToday(@Query() query: LiveChannelsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.getLeadsTodayUseCase.execute(user.orgId, user.role, user.sub, query);
  }

  /**
   * GET /analytics/live/channels
   * Messages today per channel, counted live (Message City 3D view).
   */
  @Get('live/channels')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  async getLiveChannels(
    @Query() query: LiveChannelsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getLiveChannelStatsUseCase.execute(
      user.orgId,
      user.role,
      user.sub,
      query,
    );
  }

  /**
   * GET /analytics/export
   * Export analytics data as CSV.
   */
  @Get('export')
  @Permissions(PERMISSIONS.ANALYTICS_EXPORT)
  async exportAnalytics(
    @CurrentUser() user: JwtPayload,
    @Query('type') type: 'messages' | 'conversions' | 'campaigns' = 'messages',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.exportAnalyticsUseCase.execute({
      orgId: user.orgId,
      type,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
    res!.setHeader('Content-Type', 'text/csv');
    res!.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${new Date().toISOString().split('T')[0]}.csv"`);
    return res!.send(csv);
  }

  /**
   * GET /analytics/dashboard
   * All key metrics in one payload.
   */
  @Get('dashboard')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  async getDashboard(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getDashboardOverviewUseCase.execute(
      user.orgId,
      user.role,
      user.sub,
      query,
    );
  }

  /**
   * GET /analytics/messages
   * Message volume time series.
   */
  @Get('messages')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  async getMessageVolume(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getMessageVolumeUseCase.execute(
      user.orgId,
      user.role,
      user.sub,
      query,
    );
  }

  /**
   * GET /analytics/response-time
   * Response time series.
   */
  @Get('response-time')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  async getResponseTime(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getResponseTimeUseCase.execute(
      user.orgId,
      user.role,
      user.sub,
      query,
    );
  }

  /**
   * GET /analytics/conversion-funnel
   * Lead conversion funnel (org-wide, ADMIN/MANAGER only).
   */
  @Get('conversion-funnel')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  async getConversionFunnel(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getConversionFunnelUseCase.execute(user.orgId, query);
  }

  /**
   * GET /analytics/peak-hours
   * Peak activity hours (ADMIN/MANAGER only).
   */
  @Get('peak-hours')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  async getPeakHours(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getPeakHoursUseCase.execute(user.orgId, query);
  }

  /**
   * GET /analytics/team-performance
   * Per-user breakdown (ADMIN/MANAGER only).
   */
  @Get('team-performance')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  async getTeamPerformance(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getTeamPerformanceUseCase.execute(
      user.orgId,
      user.role,
      user.sub,
      query,
    );
  }

  /**
   * GET /analytics/campaigns
   * Campaign summary (ADMIN/MANAGER only).
   */
  @Get('campaigns')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  async getCampaignSummary(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getCampaignSummaryUseCase.execute(user.orgId, query);
  }

  /**
   * POST /analytics/backfill
   * Trigger historical data backfill (ADMIN only).
   * Returns 202 Accepted with the number of jobs queued.
   */
  @Post('backfill')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerBackfill(
    @Body() body: BackfillDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const start = new Date(body.startDate);
    const end = body.endDate ? new Date(body.endDate) : new Date();
    end.setDate(end.getDate() - 1); // up to yesterday

    let jobsCreated = 0;
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);

      // Daily aggregation job
      await this.queueService.publishOnce(
        QUEUE_NAMES.ANALYTICS_DAILY_AGGREGATE,
        { targetDate: dateStr },
        `daily-${dateStr}`,
      );

      // Hourly aggregation jobs for each hour of the day
      for (let h = 0; h < 24; h++) {
        const hourDate = new Date(current);
        hourDate.setUTCHours(h, 0, 0, 0);
        await this.queueService.publishOnce(
          QUEUE_NAMES.ANALYTICS_HOURLY_AGGREGATE,
          { targetHour: hourDate.toISOString() },
          `hourly-${hourDate.toISOString()}`,
        );
        jobsCreated++;
      }

      jobsCreated++;
      current.setDate(current.getDate() + 1);
    }

    return {
      message: 'Backfill jobs queued successfully',
      jobsCreated,
    };
  }
}
