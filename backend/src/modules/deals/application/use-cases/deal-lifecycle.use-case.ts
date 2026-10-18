import { BadRequestException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DealStatus } from '@prisma/client';
import { EVENT_NAMES } from '@/common/constants';
import type { DealStageChangedEvent } from '@/events/event-bus';
import { DealRepository } from '../../infrastructure/repositories/deal.repository';
import { PipelineRepository } from '../../infrastructure/repositories/pipeline.repository';

type CreateDealInput = Parameters<DealRepository['create']>[0];
type UpdateDealInput = Parameters<DealRepository['update']>[1];

interface DealRef {
  id: string;
  pipelineId: string;
  stageId: string;
  status: DealStatus;
}

/**
 * Every way a deal enters or changes stage goes through here, so always-on
 * sequences and automations hear about it no matter who made the change.
 */
@Injectable()
export class DealLifecycleUseCase {
  constructor(
    private readonly dealRepo: DealRepository,
    private readonly pipelineRepo: PipelineRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(input: CreateDealInput) {
    const deal = await this.dealRepo.create(input);
    this.emitStageChanged(deal, null);
    return deal;
  }

  /** Move to a stage of the deal's own pipeline; status follows the stage's won/lost flags */
  async moveToStage(deal: DealRef, stageId: string) {
    const stage = await this.pipelineRepo.findStageInPipeline(stageId, deal.pipelineId);
    if (!stage) throw new BadRequestException('Stage is not in this deal\'s pipeline');

    const moved = await this.dealRepo.updateStage(deal.id, stage);
    // Dropping a card back onto its own column is not a stage change
    if (deal.stageId !== stage.id) this.emitStageChanged(moved, deal.stageId);
    return moved;
  }

  /**
   * Field edits. Marking a deal won/lost/open also moves it to a matching stage,
   * so its board column and its status never disagree.
   */
  async update(deal: DealRef, data: UpdateDealInput) {
    const { status, ...fields } = data;
    let statusApplied = !status || status === deal.status;

    if (!statusApplied) {
      const target = await this.stageForStatus(deal, status as DealStatus);
      if (target) {
        await this.moveToStage(deal, target.id);
        statusApplied = true;
      }
    }

    // No matching stage in this pipeline: keep the column, just set the status
    return this.dealRepo.update(deal.id, { ...fields, ...(!statusApplied && { status }) });
  }

  private async stageForStatus(deal: DealRef, status: DealStatus) {
    const stages = await this.pipelineRepo.findStages(deal.pipelineId);
    const current = stages.find((s) => s.id === deal.stageId);
    const fits = (s: (typeof stages)[number]) =>
      status === DealStatus.WON ? s.isWonStage
      : status === DealStatus.LOST ? s.isLostStage
      : !s.isWonStage && !s.isLostStage;
    return current && fits(current) ? current : stages.find(fits);
  }

  private emitStageChanged(
    deal: { id: string; orgId: string; pipelineId: string; contactId: string; stageId: string },
    previousStageId: string | null,
  ) {
    const event: DealStageChangedEvent = {
      dealId: deal.id,
      orgId: deal.orgId,
      pipelineId: deal.pipelineId,
      contactId: deal.contactId,
      stageId: deal.stageId,
      previousStageId,
    };
    this.eventEmitter.emit(EVENT_NAMES.DEAL_STAGE_CHANGED, event);
  }
}
