import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
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
  UpdateAlertRuleDto,
} from '@/modules/observability/application/dto/observability.dto';
import {
  CreateAlertRuleUseCase,
  DeleteAlertRuleUseCase,
  UpdateAlertRuleUseCase,
} from '../../application/use-cases/create-alert-rule.use-case';
import { ListFailedJobsUseCase, RetryFailedJobUseCase } from '../../application/use-cases/failed-jobs.use-cases';
import { ListFailedJobsQueryDto } from '../../application/dto/failed-jobs.dto';
import { ListKillSwitchesUseCase, SetKillSwitchUseCase } from '../../application/use-cases/kill-switches.use-cases';
import { SetKillSwitchDto } from '../../application/dto/kill-switch.dto';
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
    private readonly updateAlertRuleUseCase: UpdateAlertRuleUseCase,
    private readonly deleteAlertRuleUseCase: DeleteAlertRuleUseCase,
    private readonly listFailedJobsUseCase: ListFailedJobsUseCase,
    private readonly retryFailedJobUseCase: RetryFailedJobUseCase,
    private readonly listKillSwitchesUseCase: ListKillSwitchesUseCase,
    private readonly setKillSwitchUseCase: SetKillSwitchUseCase,
  ) {}

  /** Platform kill switch state for every feature (campaigns, automation, api, ai, shopify). */
  @Get('kill-switches')
  async listKillSwitches() {
    return this.listKillSwitchesUseCase.execute();
  }

  /** Turn a feature off (or back on) for every org. `reason` is required when disabling. */
  @Post('kill-switches/:feature')
  @HttpCode(HttpStatus.OK)
  async setKillSwitch(
    @Param('feature') feature: string,
    @Body() dto: SetKillSwitchDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.setKillSwitchUseCase.execute(feature, dto, { id: user.sub, email: user.email }, requestMeta(req));
  }

  /** Failed/expired background jobs across all queues (or one). */
  @Get('jobs/failed')
  async listFailedJobs(@Query() query: ListFailedJobsQueryDto) {
    return this.listFailedJobsUseCase.execute(query);
  }

  /** Re-queues a failed job's payload as a new job — once per failed job. */
  @Post('jobs/:id/retry')
  @HttpCode(HttpStatus.OK)
  async retryJob(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.retryFailedJobUseCase.execute(id, { id: user.sub, email: user.email }, requestMeta(req));
  }

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

  /** Edit a rule, or pause/resume it with `{ enabled }`. */
  @Patch('alerts/rules/:id')
  async updateAlertRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlertRuleDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.updateAlertRuleUseCase.execute(id, dto, { id: user.sub, email: user.email }, requestMeta(req));
  }

  /** Only rules that never fired; others must be disabled to keep their history. */
  @Delete('alerts/rules/:id')
  async deleteAlertRule(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.deleteAlertRuleUseCase.execute(id, { id: user.sub, email: user.email }, requestMeta(req));
  }
}
