import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DealRepository } from '@/modules/deals/infrastructure/repositories/deal.repository';
import { EVENT_NAMES } from '@/common/constants';

/**
 * Every 5 minutes, notifies whoever owns a deal whose follow-up time has come.
 * Each follow-up time is notified once; setting a new time re-arms it.
 */
@Injectable()
export class DealFollowUpWorker {
  private readonly logger = new Logger(DealFollowUpWorker.name);

  constructor(
    private readonly dealRepo: DealRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron('0 */5 * * * *')
  async notifyDueFollowUps(): Promise<void> {
    const now = new Date();
    const due = await this.dealRepo.findFollowUpsToNotify(now);

    for (const deal of due) {
      try {
        await this.dealRepo.markFollowUpNotified(deal.id, now);
        this.eventEmitter.emit(EVENT_NAMES.DEAL_FOLLOW_UP_DUE, {
          dealId: deal.id,
          orgId: deal.orgId,
          pipelineId: deal.pipelineId,
          title: deal.title,
          contactId: deal.contact.id,
          contactName: deal.contact.name ?? deal.contact.phoneNumber,
          note: deal.followUpNote,
          userId: deal.assignedToId ?? deal.contact.ownerId ?? null,
        });
      } catch (error) {
        this.logger.error(`Follow-up notification failed for deal ${deal.id}: ${error}`);
      }
    }

    if (due.length) this.logger.log(`Notified ${due.length} due deal follow-ups`);
  }
}
