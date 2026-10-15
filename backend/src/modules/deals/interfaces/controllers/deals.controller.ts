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
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { DealStatus, UsageMetricType } from '@prisma/client';
import { UsageLimitGuard, USAGE_LIMIT_KEY } from '@/modules/billing/interfaces/guards/usage-limit.guard';
import { UsageTrackingService } from '@/modules/billing/domain/services/usage-tracking.service';
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
import { Throttle } from '@nestjs/throttler';
import { DEFAULT_PIPELINE_STAGES } from '@/shared/constants/org-defaults';
import { localDayStart } from '@/modules/messages/domain/services/send-safety.policy';

@Controller('pipelines')
export class DealsController {
  constructor(
    private readonly pipelineRepo: PipelineRepository,
    private readonly dealRepo: DealRepository,
    private readonly scoreDealUseCase: ScoreDealUseCase,
    private readonly usageTracking: UsageTrackingService,
    private readonly dealGuard: DealGuardUseCase,
  ) {}

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
    return this.dealRepo.findByContact(user.orgId, contactId);
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
    return this.dealRepo.findFollowUpsDue(user.orgId, until);
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
    // Every referenced id must belong to this org (and the stage to this pipeline)
    const invalid = await this.dealRepo.findInvalidRefs(user.orgId, {
      pipelineId,
      stageId: dto.stageId,
      contactId: dto.contactId,
      assignedToId: dto.assignedToId,
      productId: dto.productId,
    });
    if (invalid.length) throw new BadRequestException(`Invalid ${invalid.join(', ')}`);

    return this.dealRepo.create({
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
    return this.dealRepo.findByPipeline(user.orgId, pipelineId);
  }

  @Get(':pipelineId/deals/:dealId')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async getDeal(
    @CurrentUser() user: JwtPayload,
    @Param('dealId', ParseUUIDPipe) dealId: string,
  ) {
    const deal = await this.dealRepo.findByIdAndOrg(dealId, user.orgId);
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  @Patch(':pipelineId/deals/:dealId')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  async updateDeal(
    @CurrentUser() user: JwtPayload,
    @Param('dealId', ParseUUIDPipe) dealId: string,
    @Body() dto: UpdateDealDto,
  ) {
    const deal = await this.dealRepo.findByIdAndOrg(dealId, user.orgId);
    if (!deal) throw new NotFoundException('Deal not found');
    return this.dealRepo.update(dealId, {
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
    const deal = await this.dealRepo.findByIdAndOrg(dealId, user.orgId);
    if (!deal) throw new NotFoundException('Deal not found');

    // The target stage must be in the deal's own pipeline; its won/lost flags set the status
    const stage = deal.pipeline
      ? await this.pipelineRepo.findStageInPipeline(dto.stageId, deal.pipelineId)
      : null;
    if (!stage) throw new BadRequestException('Stage is not in this deal\'s pipeline');

    return this.dealRepo.updateStage(dealId, stage);
  }

  @Delete(':pipelineId/deals/:dealId')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.OK)
  async deleteDeal(
    @CurrentUser() user: JwtPayload,
    @Param('dealId', ParseUUIDPipe) dealId: string,
  ) {
    const deal = await this.dealRepo.findByIdAndOrg(dealId, user.orgId);
    if (!deal) throw new NotFoundException('Deal not found');
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
    return this.dealGuard.draftScope(user.orgId, dealId, () =>
      this.usageTracking.incrementUsage(user.orgId, UsageMetricType.AI_CREDITS),
    );
  }

  @Patch(':pipelineId/deals/:dealId/scope')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  async saveScope(
    @CurrentUser() user: JwtPayload,
    @Param('dealId', ParseUUIDPipe) dealId: string,
    @Body() dto: SaveScopeDto,
  ) {
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
    return this.dealGuard.sendScope(user.orgId, user.sub, dealId);
  }

  // ───── AI Scoring ─────

  @Post(':pipelineId/deals/:dealId/score')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  @UseGuards(UsageLimitGuard)
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.AI_CREDITS)
  @PlatformFeature('ai')
  @HttpCode(HttpStatus.OK)
  async scoreDeal(
    @CurrentUser() user: JwtPayload,
    @Param('dealId', ParseUUIDPipe) dealId: string,
  ) {
    const result = await this.scoreDealUseCase.execute(dealId, user.orgId);
    await this.usageTracking.incrementUsage(user.orgId, UsageMetricType.AI_CREDITS);
    return result;
  }

  // ───── Analytics ─────

  @Get(':pipelineId/analytics')
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  async getAnalytics(
    @CurrentUser() user: JwtPayload,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
  ) {
    return this.dealRepo.getAnalytics(user.orgId, pipelineId);
  }
}
