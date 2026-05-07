import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { HealthService } from '../../domain/services/health.service';
import { MetricsService } from '../../domain/services/metrics.service';
import { AlertService } from '../../domain/services/alert.service';
import { ErrorTrackingService } from '../../domain/services/error-tracking.service';
import {
  QueryMetricsDto,
  QueryTimeSeriesDto,
  CreateAlertRuleDto,
  QueryAlertsDto,
  QueryErrorsDto,
} from '../../application/dto/observability.dto';

@Controller('observability')
export class ObservabilityController {
  constructor(
    private readonly healthService: HealthService,
    private readonly metricsService: MetricsService,
    private readonly alertService: AlertService,
    private readonly errorTrackingService: ErrorTrackingService,
  ) {}

  // ─── Health ──────────────────────────────────────────

  /**
   * GET /observability/health
   * System health dashboard data. AC1: loads ≤2s.
   */
  @Get('health')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.AUDIT_READ)
  async getHealth() {
    return this.healthService.getHealth();
  }

  /**
   * GET /observability/health/queues
   * Detailed queue status for each queue.
   */
  @Get('health/queues')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.AUDIT_READ)
  async getQueueStatus() {
    return this.healthService.getQueueStatus();
  }

  // ─── Metrics ─────────────────────────────────────────

  /**
   * GET /observability/metrics
   * Aggregated metric data for a given metric and time range.
   */
  @Get('metrics')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.AUDIT_READ)
  async getMetrics(@Query() query: QueryMetricsDto) {
    const now = new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(now.getTime() - 60 * 60 * 1000); // default: last 1h
    const endDate = query.endDate ? new Date(query.endDate) : now;

    return this.metricsService.getAggregated(
      query.metric,
      startDate,
      endDate,
      query.orgId,
    );
  }

  /**
   * GET /observability/metrics/timeseries
   * Time-series data points for chart rendering.
   */
  @Get('metrics/timeseries')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.AUDIT_READ)
  async getTimeSeries(@Query() query: QueryTimeSeriesDto) {
    const now = new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(now.getTime() - 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : now;

    return this.metricsService.getTimeSeries(
      query.metric,
      startDate,
      endDate,
      query.orgId,
    );
  }

  /**
   * GET /observability/metrics/latest
   * Latest snapshot of all tracked metrics.
   * AC2: Real-time updates (via periodic polling or WebSocket).
   */
  @Get('metrics/latest')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.AUDIT_READ)
  async getLatestMetrics(@CurrentUser() user: JwtPayload) {
    return this.metricsService.getLatest(user.orgId);
  }

  // ─── Alerts ──────────────────────────────────────────

  /**
   * GET /observability/alerts/rules
   * List all alert rules.
   */
  @Get('alerts/rules')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.AUDIT_READ)
  async getAlertRules() {
    return this.alertService.getAlertRules();
  }

  /**
   * POST /observability/alerts/rules
   * Create a new alert rule.
   */
  @Post('alerts/rules')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.AUDIT_READ)
  async createAlertRule(@Body() dto: CreateAlertRuleDto) {
    return this.alertService.createAlertRule(dto);
  }

  /**
   * GET /observability/alerts/history
   * Recent alert events (triggered alerts).
   */
  @Get('alerts/history')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.AUDIT_READ)
  async getAlertHistory(@Query() query: QueryAlertsDto) {
    return this.alertService.getRecentAlerts(query.limit, query.offset);
  }

  // ─── Errors ──────────────────────────────────────────

  /**
   * GET /observability/errors
   * Grouped error tracking data for dashboard.
   * AC1: Errors captured. AC3: No silent failures.
   */
  @Get('errors')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.AUDIT_READ)
  async getErrors(@Query() query: QueryErrorsDto) {
    return this.errorTrackingService.getRecentErrors(query.windowMinutes);
  }
}
