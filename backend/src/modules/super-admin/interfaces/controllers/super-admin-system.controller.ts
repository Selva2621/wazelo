import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { HealthService } from '@/modules/observability/domain/services/health.service';
import { MetricsService } from '@/modules/observability/domain/services/metrics.service';
import { AlertService } from '@/modules/observability/domain/services/alert.service';
import { ErrorTrackingService } from '@/modules/observability/domain/services/error-tracking.service';
import {
  CreateAlertRuleDto,
  QueryAlertsDto,
  QueryErrorsDto,
  QueryMetricsDto,
  QueryTimeSeriesDto,
} from '@/modules/observability/application/dto/observability.dto';
import { CreateAlertRuleUseCase } from '../../application/use-cases/create-alert-rule.use-case';
import { requestMeta } from '../request-meta';

const HOUR_MS = 60 * 60 * 1000;

function range(startDate?: string, endDate?: string): [Date, Date] {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - HOUR_MS);
  return [start, end];
}

/**
 * Platform health, metrics, alerts and errors. These are cross-tenant, so
 * they live here (super admin only) — previously any tenant ADMIN could read
 * them under /observability.
 */
@Controller('super-admin/system')
@SuperAdminOnly()
export class SuperAdminSystemController {
  constructor(
    private readonly healthService: HealthService,
    private readonly metricsService: MetricsService,
    private readonly alertService: AlertService,
    private readonly errorTrackingService: ErrorTrackingService,
    private readonly createAlertRuleUseCase: CreateAlertRuleUseCase,
  ) {}

  @Get('health')
  async getHealth() {
    return this.healthService.getHealth();
  }

  @Get('health/queues')
  async getQueueStatus() {
    return this.healthService.getQueueStatus();
  }

  /** Platform-wide unless `orgId` is given */
  @Get('metrics')
  async getMetrics(@Query() query: QueryMetricsDto) {
    const [start, end] = range(query.startDate, query.endDate);
    return this.metricsService.getAggregated(query.metric, start, end, query.orgId);
  }

  @Get('metrics/timeseries')
  async getTimeSeries(@Query() query: QueryTimeSeriesDto) {
    const [start, end] = range(query.startDate, query.endDate);
    return this.metricsService.getTimeSeries(query.metric, start, end, query.orgId);
  }

  @Get('metrics/latest')
  async getLatestMetrics() {
    return this.metricsService.getLatest();
  }

  @Get('alerts/rules')
  async getAlertRules() {
    return this.alertService.getAlertRules();
  }

  @Post('alerts/rules')
  async createAlertRule(@Body() dto: CreateAlertRuleDto, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.createAlertRuleUseCase.execute(dto, { id: user.sub, email: user.email }, requestMeta(req));
  }

  @Get('alerts/history')
  async getAlertHistory(@Query() query: QueryAlertsDto) {
    return this.alertService.getRecentAlerts(query.limit, query.offset);
  }

  @Get('errors')
  async getErrors(@Query() query: QueryErrorsDto) {
    return this.errorTrackingService.getRecentErrors(query.windowMinutes);
  }
}
