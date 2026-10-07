import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { requestMeta } from '../request-meta';
import { GetOrgMessagingHealthUseCase } from '../../application/use-cases/get-org-messaging-health.use-case';
import {
  AdminActionContext,
  AdminCancelSubscriptionUseCase,
  AdminChangePlanUseCase,
  AdminExtendTrialUseCase,
  ReactivateOrgUseCase,
  SuspendOrgUseCase,
} from '../../application/use-cases/org-management.use-cases';
import {
  AdminCancelSubscriptionDto,
  AdminChangePlanDto,
  AdminExtendTrialDto,
  SuspendOrgDto,
} from '../../application/dto/org-management.dto';
import { GetPlatformStatsUseCase } from '../../application/use-cases/get-platform-stats.use-case';
import { GetPlatformActivityUseCase } from '../../application/use-cases/get-platform-activity.use-case';
import { GetAllOrgsUseCase } from '../../application/use-cases/get-all-orgs.use-case';
import { GetOrgDetailUseCase } from '../../application/use-cases/get-org-detail.use-case';
import { ListSubscriptionsUseCase } from '../../application/use-cases/list-subscriptions.use-case';

function toInt(value: string | undefined, fallback: number): number {
  const n = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function actionContext(user: JwtPayload, req: Request): AdminActionContext {
  return { actor: { id: user.sub, email: user.email }, meta: requestMeta(req) };
}

@Controller('super-admin')
@SuperAdminOnly()
export class SuperAdminOrgsController {
  constructor(
    private readonly getStatsUseCase: GetPlatformStatsUseCase,
    private readonly getActivityUseCase: GetPlatformActivityUseCase,
    private readonly getAllOrgsUseCase: GetAllOrgsUseCase,
    private readonly getOrgDetailUseCase: GetOrgDetailUseCase,
    private readonly listSubscriptionsUseCase: ListSubscriptionsUseCase,
    private readonly suspendOrgUseCase: SuspendOrgUseCase,
    private readonly reactivateOrgUseCase: ReactivateOrgUseCase,
    private readonly cancelSubscriptionUseCase: AdminCancelSubscriptionUseCase,
    private readonly changePlanUseCase: AdminChangePlanUseCase,
    private readonly extendTrialUseCase: AdminExtendTrialUseCase,
    private readonly getMessagingHealthUseCase: GetOrgMessagingHealthUseCase,
  ) {}

  // ── Org actions ──

  @Post('organizations/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendOrg(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendOrgDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.suspendOrgUseCase.execute(id, dto.reason, actionContext(user, req));
  }

  @Post('organizations/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateOrg(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.reactivateOrgUseCase.execute(id, actionContext(user, req));
  }

  @Post('organizations/:id/subscription/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminCancelSubscriptionDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.cancelSubscriptionUseCase.execute(id, dto.reason, actionContext(user, req));
  }

  @Post('organizations/:id/subscription/change-plan')
  @HttpCode(HttpStatus.OK)
  async changePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminChangePlanDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.changePlanUseCase.execute(id, dto.planId, actionContext(user, req));
  }

  @Post('organizations/:id/subscription/extend-trial')
  @HttpCode(HttpStatus.OK)
  async extendTrial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminExtendTrialDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.extendTrialUseCase.execute(id, dto.days, actionContext(user, req));
  }

  @Get('stats')
  async getStats() {
    return this.getStatsUseCase.execute();
  }

  @Get('activity')
  async getActivity(@Query('limit') limit?: string) {
    return this.getActivityUseCase.execute(Math.min(toInt(limit, 10), 50));
  }

  @Get('organizations')
  async listOrgs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.getAllOrgsUseCase.execute({
      page: toInt(page, 1),
      limit: toInt(limit, 20),
      search,
      status,
    });
  }

  @Get('organizations/:id')
  async getOrg(@Param('id', ParseUUIDPipe) id: string) {
    return this.getOrgDetailUseCase.execute(id);
  }

  @Get('organizations/:id/messaging-health')
  async getMessagingHealth(@Param('id', ParseUUIDPipe) id: string) {
    return this.getMessagingHealthUseCase.execute(id);
  }

  @Get('subscriptions')
  async listSubscriptions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.listSubscriptionsUseCase.execute({ page: toInt(page, 1), limit: toInt(limit, 20), status });
  }
}
