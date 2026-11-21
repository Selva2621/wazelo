import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { DealStatus } from '@prisma/client';
import { AiCredits } from '@/modules/billing/interfaces/guards/ai-credit.guard';
import { AiCreditsService } from '@/modules/billing/domain/services/ai-credits.service';
import { PlatformFeature } from '@/modules/billing/interfaces/guards/platform-feature.guard';
import { PipelineRepository } from '../../infrastructure/repositories/pipeline.repository';
import { DealRepository } from '../../infrastructure/repositories/deal.repository';
import {
  CreatePipelineDto,
  UpdatePipelineDto,
  CreateDealDto,
  UpdateDealDto,
  MoveDealDto,
  ListFollowUpsQueryDto,
  SaveScopeDto,
} from '../../application/dto';
import { ScoreDealUseCase } from '../../application/use-cases/score-deal.use-case';
import { DealGuardUseCase } from '../../application/use-cases/deal-guard.use-case';
import { DealAccessUseCase } from '../../application/use-cases/deal-access.use-case';
import { DealLifecycleUseCase } from '../../application/use-cases/deal-lifecycle.use-case';
import { Throttle } from '@nestjs/throttler';
import { DEFAULT_PIPELINE_STAGES } from '@/shared/constants/org-defaults';
import { localDayStart } from '@/modules/messages/domain/services/send-safety.policy';

@Controller('pipelines')
export class DealsController {
  constructor(
    private readonly pipelineRepo: PipelineRepository,
    private readonly dealRepo: DealRepository,
    private readonly scoreDealUseCase: ScoreDealUseCase,
    private readonly aiCredits: AiCreditsService,
    private readonly dealGuard: DealGuardUseCase,
    private readonly dealAccess: DealAccessUseCase,
    private readonly dealLifecycle: DealLifecycleUseCase,
  ) {}

  /** A deal in this org the user is allowed to see, or 404 */
  private async findDeal(user: JwtPayload, dealId: string) {
    const scope = await this.dealAccess.scopeFor(user);
    const deal = await this.dealRepo.findByIdAndOrg(dealId, user.orgId, scope);
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  // ───── Pipelines ─────

  @Post()
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async createPipeline(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePipelineDto,
  ) {
    const stages = dto.stages?.length ? dto.stages : DEFAULT_PIPELINE_STAGES;
    return this.pipelineRepo.create({
      orgId: user.orgId,
      name: dto.name,
      description: dto.description,
      stages,
    });
  }

  @Get()
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async listPipelines(@CurrentUser() user: JwtPayload) {
    return this.pipelineRepo.findByOrg(user.orgId);
  }

  @Get(':pipelineId')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async getPipeline(
    @CurrentUser() user: JwtPayload,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
  ) {
    const pipeline = await this.pipelineRepo.findByIdAndOrg(pipelineId, user.orgId);
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    return pipeline;
  }

  @Patch(':pipelineId')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  async updatePipeline(
    @CurrentUser() user: JwtPayload,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Body() dto: UpdatePipelineDto,
  ) {
    const pipeline = await this.pipelineRepo.findByIdAndOrg(pipelineId, user.orgId);
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    return this.pipelineRepo.update(pipelineId, dto);
  }

  @Delete(':pipelineId')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.OK)
  async deletePipeline(
    @CurrentUser() user: JwtPayload,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
  ) {
    const pipeline = await this.pipelineRepo.findByIdAndOrg(pipelineId, user.orgId);
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    await this.pipelineRepo.softDelete(pipelineId);
    return { success: true };
  }

  // ───── Deals by Contact ─────

  @Get('deals/by-contact/:contactId')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async getDealsByContact(
    @CurrentUser() user: JwtPayload,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.dealRepo.findByContact(user.orgId, contactId, await this.dealAccess.scopeFor(user));
  }

  // ───── Follow-ups ─────

  @Get('deals/follow-ups')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async listFollowUps(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListFollowUpsQueryDto,
  ) {
    const now = new Date();
    const endOfToday = new Date(localDayStart(now, query.tz || 'UTC').getTime() + 24 * 60 * 60 * 1000);
    const until =
      query.scope === 'upcoming' ? new Date(endOfToday.getTime() + 7 * 24 * 60 * 60 * 1000) : endOfToday;
    return this.dealRepo.findFollowUpsDue(user.orgId, until, await this.dealAccess.scopeFor(user));
  }

  // ───── Deals ─────

  @Post(':pipelineId/deals')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async createDeal(
    @CurrentUser() user: JwtPayload,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Body() dto: CreateDealDto,
  ) {
    // Every referenced id must belong to this org (and the stage to this pipeline),
    // and the contact must be one the user can see
    const invalid = await this.dealRepo.findInvalidRefs(user.orgId, {
      pipelineId,
      stageId: dto.stageId,
      contactId: dto.contactId,
      assignedToId: dto.assignedToId,
      productId: dto.productId,
    }, await this.dealAccess.scopeFor(user));
    if (invalid.length) throw new BadRequestException(`Invalid ${invalid.join(', ')}`);

    return this.dealLifecycle.create({
      orgId: user.orgId,
      pipelineId,
      stageId: dto.stageId,
      contactId: dto.contactId,
      assignedToId: dto.assignedToId,
      title: dto.title,
      value: dto.value,
      currency: dto.currency,
      expectedClose: dto.expectedClose ? new Date(dto.expectedClose) : undefined,
      notes: dto.notes,
      productId: dto.productId,
    });
  }

  @Get(':pipelineId/deals')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async listDeals(
    @CurrentUser() user: JwtPayload,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
  ) {
    return this.dealRepo.findByPipeline(user.orgId, pipelineId, await this.dealAccess.scopeFor(user));
  }

  @Get(':pipelineId/deals/:dealId')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async getDeal(
    @CurrentUser() user: JwtPayload,
    @Param('dealId', ParseUUIDPipe) dealId: string,
  ) {
    return this.findDeal(user, dealId);
  }

  @Patch(':pipelineId/deals/:dealId')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  async updateDeal(
    @CurrentUser() user: JwtPayload,
    @Param('dealId', ParseUUIDPipe) dealId: string,
    @Body() dto: UpdateDealDto,
  ) {
    const deal = await this.findDeal(user, dealId);
    return this.dealLifecycle.update(deal, {
      ...dto,
      value: dto.value,
      expectedClose: dto.expectedClose ? new Date(dto.expectedClose) : undefined,
      status: dto.status as DealStatus | undefined,
      nextFollowUpAt:
        dto.nextFollowUpAt === undefined ? undefined : dto.nextFollowUpAt === null ? null : new Date(dto.nextFollowUpAt),
    });
  }

  @Post(':pipelineId/deals/:dealId/move')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.OK)
  async moveDeal(
    @CurrentUser() user: JwtPayload,
    @Param('dealId', ParseUUIDPipe) dealId: string,
    @Body() dto: MoveDealDto,
  ) {
    const deal = await this.findDeal(user, dealId);
    return this.dealLifecycle.moveToStage(deal, dto.stageId);
  }

  @Delete(':pipelineId/deals/:dealId')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.OK)
  async deleteDeal(
    @CurrentUser() user: JwtPayload,
    @Param('dealId', ParseUUIDPipe) dealId: string,
  ) {
    await this.findDeal(user, dealId);
    await this.dealRepo.softDelete(dealId);
    return { success: true };
  }

  // ───── Deal Guard (ghost radar, trust card, scope lock) ─────

  @Get(':pipelineId/deals/:dealId/guard')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async getDealGuard(
    @CurrentUser() user: JwtPayload,
    @Param('dealId', ParseUUIDPipe) dealId: string,
  ) {
    await this.findDeal(user, dealId);
    return this.dealGuard.getGuard(user.orgId, dealId);
  }

  @Post(':pipelineId/deals/:dealId/scope/draft')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  async draftScope(
    @CurrentUser() user: JwtPayload,
    @Param('dealId', ParseUUIDPipe) dealId: string,
  ) {
    await this.findDeal(user, dealId);
    // Out of AI credits → the fill-in template instead of a 403
    return this.dealGuard.draftScope(user.orgId, dealId, {
      allowed: await this.aiCredits.canAfford(user.orgId, 'deal_scope'),
      onUsed: () => this.aiCredits.charge(user.orgId, 'deal_scope'),
    });
  }

  @Patch(':pipelineId/deals/:dealId/scope')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  async saveScope(
    @CurrentUser() user: JwtPayload,
    @Param('dealId', ParseUUIDPipe) dealId: string,
    @Body() dto: SaveScopeDto,
  ) {
    await this.findDeal(user, dealId);
    return this.dealGuard.saveScope(user.orgId, dealId, dto.summary);
  }

  @Post(':pipelineId/deals/:dealId/scope/send')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async sendScope(
    @CurrentUser() user: JwtPayload,
    @Param('dealId', ParseUUIDPipe) dealId: string,
  ) {
    await this.findDeal(user, dealId);
    return this.dealGuard.sendScope(user.orgId, user.sub, dealId);
  }

  // ───── AI Scoring ─────

  @Post(':pipelineId/deals/:dealId/score')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  @PlatformFeature('ai')
  @AiCredits('deal_score')
  @HttpCode(HttpStatus.OK)
  async scoreDeal(
    @CurrentUser() user: JwtPayload,
    @Param('dealId', ParseUUIDPipe) dealId: string,
  ) {
    await this.findDeal(user, dealId);
    return this.scoreDealUseCase.execute(dealId, user.orgId);
  }

  // ───── Analytics ─────

  @Get(':pipelineId/analytics')
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  async getAnalytics(
    @CurrentUser() user: JwtPayload,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
  ) {
    return this.dealRepo.getAnalytics(user.orgId, pipelineId, await this.dealAccess.scopeFor(user));
  }
}
