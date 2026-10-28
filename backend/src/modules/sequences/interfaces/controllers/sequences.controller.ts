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
  NotFoundException,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { SequenceRepository } from '../../infrastructure/repositories/sequence.repository';
import { AudienceResolverService } from '@/modules/campaigns/domain/services/audience-resolver.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QUEUE_NAMES } from '@/common/constants';
import { CampaignAudienceType, SequenceStatus, SequenceTriggerType } from '@prisma/client';
import {
  CreateSequenceDto,
  UpdateSequenceDto,
  AddSequenceStepDto,
  UpdateSequenceStepDto,
  StartOutreachDto,
  SequenceTriggerDto,
} from '../../application/dto';
import { CreateSequenceTemplateDto, UpdateSequenceTemplateDto } from '../../application/dto/sequence-template.dto';
import { SequenceTemplateRepository } from '../../infrastructure/repositories/sequence-template.repository';
import {
  GenerateSequenceUseCase,
  MAX_STEPS,
  MIN_STEPS,
  REWRITE_STYLES,
  type RewriteStyle,
} from '../../application/use-cases/generate-sequence.use-case';
import { AiCredits } from '@/modules/billing/interfaces/guards/ai-credit.guard';
import { PlatformFeature } from '@/modules/billing/interfaces/guards/platform-feature.guard';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

class GenerateSequenceDto {
  @IsString()
  @MinLength(5)
  @MaxLength(600)
  prompt: string;

  @IsOptional()
  @IsInt()
  @Min(MIN_STEPS)
  @Max(MAX_STEPS)
  stepCount?: number;
}

class RewriteSequenceStepDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;

  @IsIn(REWRITE_STYLES)
  style: RewriteStyle;

  /** The sequence's name/description, so the rewrite keeps its purpose. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  goal?: string;
}

@Controller('sequences')
export class SequencesController {
  constructor(
    private readonly repo: SequenceRepository,
    private readonly templateRepo: SequenceTemplateRepository,
    private readonly audienceResolver: AudienceResolverService,
    private readonly queueService: QueueService,
    private readonly eventEmitter: EventEmitter2,
    private readonly generateSequence: GenerateSequenceUseCase,
  ) {}

  // ───── AI drafting (declared before the :id routes) ─────

  /** Draft a whole sequence (name, description, timed steps) from a plain-language goal. */
  @Post('generate')
  @Permissions(PERMISSIONS.CAMPAIGNS_CREATE)
  @PlatformFeature('ai')
  @AiCredits('sequence_generate')
  @HttpCode(HttpStatus.OK)
  generate(@CurrentUser('orgId') orgId: string, @Body() dto: GenerateSequenceDto) {
    return this.generateSequence.generate(orgId, dto.prompt, dto.stepCount ?? 3);
  }

  /** Rewrite one step's message: shorter, friendlier or more formal. */
  @Post('rewrite-step')
  @Permissions(PERMISSIONS.CAMPAIGNS_CREATE)
  @PlatformFeature('ai')
  @AiCredits('sequence_rewrite')
  @HttpCode(HttpStatus.OK)
  rewriteStep(@CurrentUser('orgId') orgId: string, @Body() dto: RewriteSequenceStepDto) {
    return this.generateSequence.rewriteStep(orgId, dto.message, dto.style, dto.goal);
  }

  // ───── Templates ─────

  @Get('templates')
  @Permissions(PERMISSIONS.CAMPAIGNS_READ)
  async listTemplates(
    @CurrentUser('orgId') orgId: string,
    @Query('category') category?: string,
  ) {
    return this.templateRepo.findByOrg(orgId, category);
  }

  @Post('templates')
  @Permissions(PERMISSIONS.CAMPAIGNS_CREATE)
  async createTemplate(
    @CurrentUser('orgId') orgId: string,
    @Body() dto: CreateSequenceTemplateDto,
  ) {
    return this.templateRepo.create({ orgId, ...dto } as any);
  }

  @Patch('templates/:templateId')
  @Permissions(PERMISSIONS.CAMPAIGNS_CREATE)
  async updateTemplate(
    @CurrentUser('orgId') orgId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() dto: UpdateSequenceTemplateDto,
  ) {
    const template = await this.templateRepo.findByIdAndOrg(templateId, orgId);
    if (!template) throw new NotFoundException('Template not found');
    return this.templateRepo.update(templateId, dto as any);
  }

  @Delete('templates/:templateId')
  @Permissions(PERMISSIONS.CAMPAIGNS_CREATE)
  async deleteTemplate(
    @CurrentUser('orgId') orgId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    const template = await this.templateRepo.findByIdAndOrg(templateId, orgId);
    if (!template) throw new NotFoundException('Template not found');
    await this.templateRepo.softDelete(templateId);
    return { success: true };
  }

  // ───── Sequences ─────

  @Post()
  @Permissions(PERMISSIONS.CAMPAIGNS_CREATE)
  async create(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateSequenceDto,
  ) {
    if (!dto.steps.length) {
      throw new BadRequestException('Sequence must have at least one step');
    }
    const triggerConfig = dto.trigger ? await this.resolveTriggerConfig(dto.trigger, orgId) : undefined;

    const sequence = await this.repo.create({
      orgId,
      sessionId: dto.sessionId,
      name: dto.name,
      description: dto.description,
      audienceType: dto.audienceType,
      audienceFilters: dto.trigger ? undefined : dto.audienceFilters,
      triggerType: dto.trigger?.type,
      triggerConfig,
      exitOnReply: dto.exitOnReply,
      createdById: userId,
    });

    // Create steps
    for (let i = 0; i < dto.steps.length; i++) {
      const step = dto.steps[i];
      await this.repo.addStep({
        sequenceId: sequence.id,
        orgId,
        stepOrder: i,
        name: step.name,
        messageType: step.messageType,
        messageBody: step.messageBody,
        mediaUrl: step.mediaUrl,
        mediaMimeType: step.mediaMimeType,
        delayMinutes: step.delayMinutes ?? 1440,
        conditions: step.conditions?.length ? step.conditions : undefined,
      });
    }

    return this.repo.findByIdAndOrg(sequence.id, orgId);
  }

  @Get()
  @Permissions(PERMISSIONS.CAMPAIGNS_READ)
  async list(
    @CurrentUser('orgId') orgId: string,
    @Query('status') status?: SequenceStatus,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.repo.findByOrgPaginated(orgId, {
      status,
      take: take ? parseInt(take, 10) : 20,
      skip: skip ? parseInt(skip, 10) : 0,
    });
  }

  @Get(':id')
  @Permissions(PERMISSIONS.CAMPAIGNS_READ)
  async get(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const seq = await this.repo.findByIdAndOrg(id, orgId);
    if (!seq) throw new NotFoundException('Sequence not found');
    return seq;
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.CAMPAIGNS_UPDATE)
  async update(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSequenceDto,
  ) {
    const seq = await this.repo.findByIdAndOrg(id, orgId);
    if (!seq) throw new NotFoundException('Sequence not found');
    // Paused sequences can fix settings and message text too; adding/removing messages stays draft-only
    if (seq.status !== 'DRAFT' && seq.status !== 'PAUSED') throw new BadRequestException('Only draft or paused sequences can be edited');

    // Simple field update on parent entity
    if (dto.name || dto.description !== undefined || dto.exitOnReply !== undefined) {
      await this.repo.updateStatus(id, orgId, seq.status as SequenceStatus, dto as any);
    }
    return this.repo.findByIdAndOrg(id, orgId);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.CAMPAIGNS_CANCEL)
  async delete(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const seq = await this.repo.findByIdAndOrg(id, orgId);
    if (!seq) throw new NotFoundException('Sequence not found');
    await this.repo.softDelete(id, orgId);
    return { deleted: true };
  }

  /* ─── Steps ─── */

  @Post(':id/steps')
  @Permissions(PERMISSIONS.CAMPAIGNS_UPDATE)
  async addStep(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddSequenceStepDto,
  ) {
    const seq = await this.repo.findByIdAndOrg(id, orgId);
    if (!seq) throw new NotFoundException('Sequence not found');
    if (seq.status !== 'DRAFT') throw new BadRequestException('Only DRAFT sequences can be edited');

    await this.repo.addStep({
      sequenceId: id,
      orgId,
      stepOrder: dto.stepOrder,
      name: dto.name,
      messageType: dto.messageType,
      messageBody: dto.messageBody,
      mediaUrl: dto.mediaUrl,
      mediaMimeType: dto.mediaMimeType,
      delayMinutes: dto.delayMinutes ?? 1440,
    });

    return this.repo.findByIdAndOrg(id, orgId);
  }

  @Patch(':id/steps/:stepId')
  @Permissions(PERMISSIONS.CAMPAIGNS_UPDATE)
  async updateStep(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() dto: UpdateSequenceStepDto,
  ) {
    const seq = await this.repo.findByIdAndOrg(id, orgId);
    if (!seq) throw new NotFoundException('Sequence not found');
    // Paused sequences can fix settings and message text too; adding/removing messages stays draft-only
    if (seq.status !== 'DRAFT' && seq.status !== 'PAUSED') throw new BadRequestException('Only draft or paused sequences can be edited');

    await this.repo.updateStep(stepId, orgId, dto as any);
    return this.repo.findByIdAndOrg(id, orgId);
  }

  @Delete(':id/steps/:stepId')
  @Permissions(PERMISSIONS.CAMPAIGNS_UPDATE)
  async deleteStep(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
  ) {
    const seq = await this.repo.findByIdAndOrg(id, orgId);
    if (!seq) throw new NotFoundException('Sequence not found');
    if (seq.status !== 'DRAFT') throw new BadRequestException('Only DRAFT sequences can be edited');

    await this.repo.deleteStep(stepId, orgId);
    return this.repo.findByIdAndOrg(id, orgId);
  }

  /* ─── Lifecycle ─── */

  @Post(':id/start')
  @Permissions(PERMISSIONS.CAMPAIGNS_EXECUTE)
  async start(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const seq = await this.repo.findByIdAndOrg(id, orgId);
    if (!seq) throw new NotFoundException('Sequence not found');
    if (seq.status !== 'DRAFT') throw new BadRequestException('Only DRAFT sequences can be started');
    if (!seq.steps.length) throw new BadRequestException('Sequence must have at least one step');

    // Always-on: nobody joins now — contacts are added as their trigger fires
    if (seq.triggerType) {
      await this.repo.updateStatus(id, orgId, SequenceStatus.ACTIVE, { startedAt: new Date() });
      return this.repo.findByIdAndOrg(id, orgId);
    }

    return this.enrollAndActivate(seq, orgId);
  }

  /** Stored trigger settings; each trigger type needs its own target */
  private async resolveTriggerConfig(trigger: SequenceTriggerDto, orgId: string): Promise<Record<string, unknown>> {
    switch (trigger.type) {
      case SequenceTriggerType.DEAL_STAGE_CHANGED:
        if (!trigger.stageId || !(await this.repo.stageBelongsToOrg(trigger.stageId, orgId))) {
          throw new BadRequestException('Choose a deal stage');
        }
        return { stageId: trigger.stageId };
      case SequenceTriggerType.LEAD_STATUS_CHANGED:
        if (!trigger.toStatus) throw new BadRequestException('Choose a lead status');
        return { toStatus: trigger.toStatus };
      default:
        return {};
    }
  }

  /**
   * One click from the lead scraper: create an outreach sequence for a scrape
   * run's imported leads and start it. Sends ride the bulk lane, so the
   * new-contact daily cap, sending hours and pacing all apply.
   */
  @Post('outreach')
  @Permissions(PERMISSIONS.CAMPAIGNS_EXECUTE)
  async startOutreach(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: StartOutreachDto,
  ) {
    const sessionId = await this.repo.resolveConnectedSessionId(null, orgId, userId);
    if (!sessionId) throw new BadRequestException('Connect WhatsApp first');

    const sequence = await this.repo.create({
      orgId,
      sessionId,
      name: dto.name,
      description: 'Outreach to scraped leads',
      audienceType: CampaignAudienceType.FILTERED,
      audienceFilters: {
        scrapeRunId: dto.scrapeRunId,
        // Only leads nobody has talked to yet
        ...(dto.onlyNew !== false && { leadStatuses: ['NEW'] }),
      },
      exitOnReply: true,
      createdById: userId,
    });

    for (let i = 0; i < dto.steps.length; i++) {
      await this.repo.addStep({
        sequenceId: sequence.id,
        orgId,
        stepOrder: i,
        name: `Step ${i + 1}`,
        messageType: 'TEXT',
        messageBody: dto.steps[i].messageBody,
        delayMinutes: dto.steps[i].delayMinutes,
      });
    }

    const created = await this.repo.findByIdAndOrg(sequence.id, orgId);
    try {
      return await this.enrollAndActivate(created!, orgId);
    } catch (error) {
      // Nobody to message — don't leave an empty draft behind
      await this.repo.softDelete(sequence.id, orgId);
      throw error;
    }
  }

  private async enrollAndActivate(
    seq: NonNullable<Awaited<ReturnType<SequenceRepository['findByIdAndOrg']>>>,
    orgId: string,
  ) {
    const id = seq.id;

    // Resolve audience
    const audience = await this.audienceResolver.resolveAudience(
      orgId,
      seq.audienceType as any,
      seq.audienceFilters as any,
    );

    if (!audience.contacts.length) {
      throw new BadRequestException('No eligible contacts found for this audience');
    }

    // Calculate first step delay
    const firstStep = seq.steps[0];
    const now = new Date();
    const firstStepAt = new Date(now.getTime() + (firstStep.delayMinutes ?? 0) * 60 * 1000);

    // Enroll recipients
    await this.repo.bulkEnrollRecipients(
      audience.contacts.map((c: { id: string; phoneNumber: string }) => ({
        sequenceId: seq.id,
        orgId,
        contactId: c.id,
        contactPhone: c.phoneNumber,
        nextStepAt: firstStepAt,
      })),
    );

    // Activate sequence
    await this.repo.updateStatus(id, orgId, SequenceStatus.ACTIVE, {
      startedAt: now,
      totalRecipients: audience.total,
    });

    // Kick off the step-check worker immediately
    await this.queueService.publishOnce(
      QUEUE_NAMES.SEQUENCE_STEP_CHECK,
      { sequenceId: id, orgId },
      `seq-check-${id}`,
    );

    return this.repo.findByIdAndOrg(id, orgId);
  }

  @Post(':id/pause')
  @Permissions(PERMISSIONS.CAMPAIGNS_EXECUTE)
  async pause(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const seq = await this.repo.findByIdAndOrg(id, orgId);
    if (!seq) throw new NotFoundException('Sequence not found');
    if (seq.status !== 'ACTIVE') throw new BadRequestException('Only ACTIVE sequences can be paused');

    await this.repo.updateStatus(id, orgId, SequenceStatus.PAUSED);
    return this.repo.findByIdAndOrg(id, orgId);
  }

  @Post(':id/resume')
  @Permissions(PERMISSIONS.CAMPAIGNS_EXECUTE)
  async resume(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const seq = await this.repo.findByIdAndOrg(id, orgId);
    if (!seq) throw new NotFoundException('Sequence not found');
    if (seq.status !== 'PAUSED') throw new BadRequestException('Only PAUSED sequences can be resumed');

    // Its WhatsApp number may have been logged out or banned — continue on a connected one
    const sessionId = await this.repo.resolveConnectedSessionId(seq.sessionId, orgId, userId);
    if (!sessionId) {
      throw new BadRequestException(
        'The WhatsApp number for this sequence is disconnected. Link a WhatsApp number, then resume.',
      );
    }
    if (sessionId !== seq.sessionId) await this.repo.moveToSession(id, orgId, sessionId);

    await this.repo.updateStatus(id, orgId, SequenceStatus.ACTIVE);
    return this.repo.findByIdAndOrg(id, orgId);
  }

  @Post(':id/cancel')
  @Permissions(PERMISSIONS.CAMPAIGNS_EXECUTE)
  async cancel(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const seq = await this.repo.findByIdAndOrg(id, orgId);
    if (!seq) throw new NotFoundException('Sequence not found');
    if (['COMPLETED', 'CANCELLED'].includes(seq.status)) {
      throw new BadRequestException('Sequence is already completed or cancelled');
    }

    await this.repo.updateStatus(id, orgId, SequenceStatus.CANCELLED, { completedAt: new Date() });
    return this.repo.findByIdAndOrg(id, orgId);
  }

  /* ─── Recipients ─── */

  @Get(':id/recipients')
  @Permissions(PERMISSIONS.CAMPAIGNS_READ)
  async listRecipients(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.repo.getRecipients(id, orgId, take ? parseInt(take, 10) : 50, skip ? parseInt(skip, 10) : 0);
  }

  @Get(':id/analytics')
  @Permissions(PERMISSIONS.CAMPAIGNS_READ)
  async getAnalytics(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const sequence = await this.repo.findByIdAndOrg(id, orgId);
    if (!sequence) throw new NotFoundException('Sequence not found');
    return this.repo.getAnalytics(id, orgId);
  }
}
