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
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { DealStatus, UsageMetricType } from '@prisma/client';
import { UsageLimitGuard, USAGE_LIMIT_KEY } from '@/modules/billing/interfaces/guards/usage-limit.guard';
import { UsageTrackingService } from '@/modules/billing/domain/services/usage-tracking.service';
import { PipelineRepository } from '../../infrastructure/repositories/pipeline.repository';
import { DealRepository } from '../../infrastructure/repositories/deal.repository';
import {
  CreatePipelineDto,
  UpdatePipelineDto,
  CreateDealDto,
  UpdateDealDto,
  MoveDealDto,
} from '../../application/dto';
import { ScoreDealUseCase } from '../../application/use-cases/score-deal.use-case';

@Controller('pipelines')
export class DealsController {
  constructor(
    private readonly pipelineRepo: PipelineRepository,
    private readonly dealRepo: DealRepository,
    private readonly scoreDealUseCase: ScoreDealUseCase,
    private readonly usageTracking: UsageTrackingService,
  ) {}

  // ───── Pipelines ─────

  @Post()
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async createPipeline(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePipelineDto,
  ) {
    const stages = dto.stages?.length
      ? dto.stages
      : [
          { name: 'Qualified', order: 0, color: '#6366f1' },
          { name: 'Proposal', order: 1, color: '#f59e0b' },
          { name: 'Negotiation', order: 2, color: '#3b82f6' },
          { name: 'Won', order: 3, color: '#22c55e', isWonStage: true },
          { name: 'Lost', order: 4, color: '#ef4444', isLostStage: true },
        ];
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

  // ───── Deals ─────

  @Post(':pipelineId/deals')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async createDeal(
    @CurrentUser() user: JwtPayload,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Body() dto: CreateDealDto,
  ) {
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
    return this.dealRepo.updateStage(dealId, dto.stageId, dto.status as DealStatus | undefined);
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

  // ───── AI Scoring ─────

  @Post(':pipelineId/deals/:dealId/score')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  @UseGuards(UsageLimitGuard)
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.AI_CREDITS)
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
