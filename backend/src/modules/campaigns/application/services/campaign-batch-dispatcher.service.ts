import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { CAMPAIGN_CONFIG, QUEUE_NAMES } from '@/common/constants';
import { CampaignRecipientStatus, MessageStatus } from '@prisma/client';
import { CampaignRecipientRepository } from '../../infrastructure/repositories/campaign-recipient.repository';
import { CampaignRepository } from '../../infrastructure/repositories/campaign.repository';
import { selectBatchesToDispatch } from '../../domain/services/batch-plan';

/**
 * Starts campaign batches in the right order: per WhatsApp number one batch at a
 * time (numbers in parallel), email batches all at once. Also repairs recipients
 * left QUEUED by a crash or a missed send event, so a batch can't hang forever.
 */
@Injectable()
export class CampaignBatchDispatcher {
  private readonly logger = new Logger(CampaignBatchDispatcher.name);

  constructor(
    private readonly recipientRepo: CampaignRecipientRepository,
    private readonly campaignRepo: CampaignRepository,
    private readonly queueService: QueueService,
  ) {}

  /** Publish a job for every batch that should be sending now. Returns the batch numbers. */
  async dispatch(campaignId: string, orgId: string, channel: string | null | undefined): Promise<number[]> {
    const summaries = await this.recipientRepo.getBatchWorkSummary(campaignId);
    const batchNumbers = selectBatchesToDispatch(summaries, {
      sequentialPerSession: channel !== 'EMAIL',
    });

    await Promise.all(batchNumbers.map((batchNumber) =>
      this.queueService.publishOnce(
        QUEUE_NAMES.CAMPAIGN_BATCH,
        { campaignId, orgId, batchNumber },
        `campaign-batch-${campaignId}-${batchNumber}`,
      ),
    ));
    return batchNumbers;
  }

  /**
   * Fix recipients stuck in QUEUED:
   * - message already sent/failed but the event was missed → record the outcome
   * - claimed but no message was ever created (crash) → back to PENDING
   * Messages still QUEUED/PROCESSING are left alone (message recovery and the
   * send-window hold own them). Returns how many recipients were repaired.
   */
  async repairStuckRecipients(campaignId: string, orgId: string): Promise<number> {
    const cutoff = new Date(Date.now() - CAMPAIGN_CONFIG.STALE_QUEUED_RECIPIENT_MS);
    const stale = await this.recipientRepo.findStaleQueued(campaignId, cutoff);
    if (stale.length === 0) return 0;

    let repaired = 0;
    const touchedBatches = new Set<number>();

    for (const recipient of stale) {
      const messageStatus = recipient.message?.status;

      if (
        messageStatus === MessageStatus.SENT ||
        messageStatus === MessageStatus.DELIVERED ||
        messageStatus === MessageStatus.READ
      ) {
        const delivered = messageStatus !== MessageStatus.SENT;
        const updated = await this.recipientRepo.updateStatusIfCurrent(
          recipient.id,
          CampaignRecipientStatus.QUEUED,
          delivered ? CampaignRecipientStatus.DELIVERED : CampaignRecipientStatus.SENT,
          { processedAt: new Date() },
        );
        if (updated) {
          await this.campaignRepo.incrementCounter(campaignId, 'sentCount', 1);
          if (delivered) await this.campaignRepo.incrementCounter(campaignId, 'deliveredCount', 1);
          repaired++;
          touchedBatches.add(recipient.batchNumber);
        }
        continue;
      }

      if (messageStatus === MessageStatus.FAILED) {
        if (await this.recipientRepo.markFailedIfActive(
          recipient.id,
          recipient.message?.failedReason ?? 'Message failed',
        )) {
          await this.campaignRepo.incrementCounter(campaignId, 'failedCount', 1);
          repaired++;
          touchedBatches.add(recipient.batchNumber);
        }
        continue;
      }

      // Claimed, but the sender never got as far as creating the message / email
      if (!recipient.messageId && !recipient.emailMessageId) {
        if (await this.recipientRepo.requeueStuck(recipient.id)) {
          repaired++;
          touchedBatches.add(recipient.batchNumber);
        }
      }
    }

    // Kick each repaired batch: it either sends its next recipient or settles,
    // which starts that number's next batch / completes the campaign.
    await Promise.all([...touchedBatches].map((batchNumber) =>
      this.queueService.publishOnce(
        QUEUE_NAMES.CAMPAIGN_BATCH,
        { campaignId, orgId, batchNumber },
        `campaign-batch-repair-${campaignId}-${batchNumber}-${Date.now()}`,
      ),
    ));

    if (repaired > 0) {
      this.logger.warn(`Campaign ${campaignId}: repaired ${repaired} stuck recipient(s)`);
    }
    return repaired;
  }
}
