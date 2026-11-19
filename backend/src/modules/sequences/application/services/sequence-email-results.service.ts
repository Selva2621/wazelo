import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CampaignRecipientStatus } from '@prisma/client';
import { EVENT_NAMES } from '@/common/constants';
import type { EmailOutcomeEvent } from '@/modules/email/application/services/org-email.service';
import { SequenceRepository } from '../../infrastructure/repositories/sequence.repository';

/** A sequence's email step: the email's result (sent / failed, with the reason) lands on the recipient's step */
@Injectable()
export class SequenceEmailResultsService {
  private readonly logger = new Logger(SequenceEmailResultsService.name);

  constructor(private readonly repo: SequenceRepository) {}

  @OnEvent(EVENT_NAMES.EMAIL_SENT, { async: true })
  async onSent(e: EmailOutcomeEvent): Promise<void> {
    if (e.source !== 'SEQUENCE' || !e.sourceId) return;
    await this.update(e.sourceId, CampaignRecipientStatus.SENT);
  }

  @OnEvent(EVENT_NAMES.EMAIL_FAILED, { async: true })
  async onFailed(e: EmailOutcomeEvent): Promise<void> {
    if (e.source !== 'SEQUENCE' || !e.sourceId) return;
    await this.update(e.sourceId, CampaignRecipientStatus.FAILED, e.error);
  }

  private async update(recipientStepId: string, status: CampaignRecipientStatus, failedReason?: string) {
    try {
      await this.repo.updateRecipientStepStatus(recipientStepId, status, { processedAt: new Date(), ...(failedReason ? { failedReason } : {}) });
    } catch (err) {
      this.logger.error(`Couldn't record email result on sequence step ${recipientStepId}: ${(err as Error).message}`);
    }
  }
}
