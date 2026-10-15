import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { sendCsv } from '../csv-response';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { requestMeta } from '../request-meta';
import { GetOrgMessagingHealthUseCase } from '../../application/use-cases/get-org-messaging-health.use-case';
import {
  GetOrgEntitlementsUseCase,
  RemoveEntitlementOverrideUseCase,
  SetEntitlementOverrideUseCase,
} from '../../application/use-cases/entitlements.use-cases';
import { SetEntitlementOverrideDto } from '../../application/dto/entitlement.dto';
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
  AdminUpdateOrgDto,
  AdminDeleteOrgDto,
} from '../../application/dto/org-management.dto';
import {
  AdminDeleteOrgUseCase,
  AdminExportOrgUseCase,
  AdminRestoreOrgUseCase,
  AdminUpdateOrgUseCase,
} from '../../application/use-cases/org-lifecycle.use-cases';
import { GetPlatformStatsUseCase } from '../../application/use-cases/get-platform-stats.use-case';
import { GetPlatformActivityUseCase } from '../../application/use-cases/get-platform-activity.use-case';
import { GetAllOrgsUseCase } from '../../application/use-cases/get-all-orgs.use-case';
import { GetOrgDetailUseCase } from '../../application/use-cases/get-org-detail.use-case';
import { GlobalSearchUseCase } from '../../application/use-cases/global-search.use-case';
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
    private readonly getEntitlementsUseCase: GetOrgEntitlementsUseCase,
    private readonly setEntitlementUseCase: SetEntitlementOverrideUseCase,
    private readonly removeEntitlementUseCase: RemoveEntitlementOverrideUseCase,
    private readonly updateOrgUseCase: AdminUpdateOrgUseCase,
    private readonly deleteOrgUseCase: AdminDeleteOrgUseCase,
    private readonly restoreOrgUseCase: AdminRestoreOrgUseCase,
    private readonly exportOrgUseCase: AdminExportOrgUseCase,
    private readonly globalSearchUseCase: GlobalSearchUseCase,
  ) {}

  /** Header search: top 5 orgs, users, phone numbers, tickets and invoices (min 2 chars). */
  @Get('search')
  async search(@Query('q') q?: string) {
    return this.globalSearchUseCase.execute(q);
  }

  // ── Org lifecycle ──

  @Patch('organizations/:id')
  async updateOrg(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateOrgDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.updateOrgUseCase.execute(id, dto, actionContext(user, req));
  }

  /** Soft delete; restorable for 30 days. Body must repeat the org name. */
  @Post('organizations/:id/delete')
  @HttpCode(HttpStatus.OK)
  async deleteOrg(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminDeleteOrgDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.deleteOrgUseCase.execute(id, dto.confirmName, dto.reason, actionContext(user, req));
  }

  @Post('organizations/:id/restore')
  @HttpCode(HttpStatus.OK)
  async restoreOrg(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.restoreOrgUseCase.execute(id, actionContext(user, req));
  }

  /** JSON copy of the org's data (no credentials, no message content); audited. */
  @Get('organizations/:id/export')
  async exportOrg(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.exportOrgUseCase.execute(id, actionContext(user, req));
  }

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
    @Query('sort') sort?: string,
    @Query('order') order?: string,
  ) {
    return this.getAllOrgsUseCase.execute({
      page: toInt(page, 1),
      limit: toInt(limit, 20),
      search,
      status,
      sort,
      order,
    });
  }

  /** Same filters and sort as the list, as a CSV download (max 10,000 rows). Declared before ':id'. */
  @Get('organizations/export.csv')
  async exportOrgs(
    @Res() res: Response,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
  ) {
    sendCsv(res, await this.getAllOrgsUseCase.exportCsv({ search, status, sort, order }));
  }

  @Get('organizations/:id')
  async getOrg(@Param('id', ParseUUIDPipe) id: string) {
    return this.getOrgDetailUseCase.execute(id);
  }

  // ── Per-org limit / feature overrides ──

  @Get('organizations/:id/entitlements')
  async getEntitlements(@Param('id', ParseUUIDPipe) id: string) {
    return this.getEntitlementsUseCase.execute(id);
  }

  @Put('organizations/:id/entitlements')
  async setEntitlement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetEntitlementOverrideDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const ctx = actionContext(user, req);
    return this.setEntitlementUseCase.execute(id, dto, ctx.actor, ctx.meta);
  }

  @Delete('organizations/:id/entitlements/:overrideId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEntitlement(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('overrideId', ParseUUIDPipe) overrideId: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const ctx = actionContext(user, req);
    await this.removeEntitlementUseCase.execute(id, overrideId, ctx.actor, ctx.meta);
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
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
  ) {
    return this.listSubscriptionsUseCase.execute({
      page: toInt(page, 1),
      limit: toInt(limit, 20),
      status,
      search,
      sort,
      order,
    });
  }

  /** Same filters and sort as the list, as a CSV download (max 10,000 rows). */
  @Get('subscriptions/export.csv')
  async exportSubscriptions(
    @Res() res: Response,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
  ) {
    sendCsv(res, await this.listSubscriptionsUseCase.exportCsv({ status, search, sort, order }));
  }
}
