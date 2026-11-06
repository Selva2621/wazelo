import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CampaignRepository } from '@/modules/campaigns/infrastructure/repositories/campaign.repository';
import { CampaignRecipientRepository } from '@/modules/campaigns/infrastructure/repositories/campaign-recipient.repository';
import { AppWebSocketGateway } from '@/infrastructure/websocket/websocket.gateway';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { CampaignBatchDispatcher } from '@/modules/campaigns/application/services/campaign-batch-dispatcher.service';
import { EVENT_NAMES, QUEUE_NAMES } from '@/common/constants';
import {
  WhatsAppMessageSentEvent,
  WhatsAppMessageFailedEvent,
  WhatsAppMessageDeliveredEvent,
  WhatsAppMessageReadEvent,
  CampaignProgressEvent,
  CampaignStartedEvent,
  CampaignCompletedEvent,
  CampaignPausedEvent,
  CampaignResumedEvent,
  CampaignFailedEvent,
  CampaignCancelledEvent,
} from '@/events/event-bus';
import { CampaignRecipientStatus, CampaignStatus } from '@prisma/client';
import type { EmailOutcomeEvent } from '@/modules/email/application/services/org-email.service';

@Injectable()
export class CampaignEventsHandler {
  private readonly logger = new Logger(CampaignEventsHandler.name);

  constructor(
    private readonly campaignRepo: CampaignRepository,
    private readonly recipientRepo: CampaignRecipientRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly wsGateway: AppWebSocketGateway,
    private readonly queueService: QueueService,
    private readonly batchDispatcher: CampaignBatchDispatcher,
  ) {}

  // ─── Email campaigns: the email's result updates its recipient ───

  @OnEvent(EVENT_NAMES.EMAIL_SENT)
  async handleEmailSent(payload: EmailOutcomeEvent): Promise<void> {
    if (payload.source !== 'CAMPAIGN') return;
    const recipient = await this.recipientRepo.findByEmailMessageId(payload.emailMessageId);
    if (!recipient) return;
    const updated = await this.recipientRepo.updateStatusIfCurrent(
      recipient.id,
      CampaignRecipientStatus.QUEUED,
      CampaignRecipientStatus.SENT,
      { processedAt: new Date() },
    );
    if (!updated) return;
    await this.campaignRepo.incrementCounter(recipient.campaignId, 'sentCount', 1);
    await this.emitProgressAndCheckCompletion(recipient.campaignId);
    await this.dispatchNextRecipient(recipient.campaignId, recipient.batchNumber, recipient.id);
  }

  @OnEvent(EVENT_NAMES.EMAIL_FAILED)
  async handleEmailFailed(payload: EmailOutcomeEvent): Promise<void> {
    if (payload.source !== 'CAMPAIGN') return;
    const recipient = await this.recipientRepo.findByEmailMessageId(payload.emailMessageId);
    if (!recipient) return;
    const failed = await this.recipientRepo.markFailedIfActive(
      recipient.id,
      payload.error ?? 'Email failed',
    );
    if (!failed) return;
    await this.campaignRepo.incrementCounter(recipient.campaignId, 'failedCount', 1);
    await this.emitProgressAndCheckCompletion(recipient.campaignId);
    await this.dispatchNextRecipient(recipient.campaignId, recipient.batchNumber, recipient.id);
  }

  /** A batch handed out all its recipients (some may have been skipped, which sends no event) */
  @OnEvent(EVENT_NAMES.CAMPAIGN_BATCH_SETTLED)
  async handleBatchSettled(payload: { campaignId: string; orgId?: string }): Promise<void> {
    await this.emitProgressAndCheckCompletion(payload.campaignId);

    // Start the next batch on the number that just finished one
    const campaign = await this.campaignRepo.findById(payload.campaignId);
    if (campaign?.status === CampaignStatus.RUNNING) {
      await this.batchDispatcher.dispatch(campaign.id, campaign.orgId, campaign.channel);
    }
  }

  // ─── Message lifecycle → Campaign progress tracking ───

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_SENT)
  async handleMessageSent(payload: WhatsAppMessageSentEvent): Promise<void> {
    const recipient = await this.recipientRepo.findByMessageId(payload.messageId);
    if (!recipient) return; // Not a campaign message

    const updated = await this.recipientRepo.updateStatusIfCurrent(
      recipient.id,
      CampaignRecipientStatus.QUEUED,
      CampaignRecipientStatus.SENT,
      { processedAt: new Date() },
    );
    if (!updated) return;
    await this.campaignRepo.incrementCounter(recipient.campaignId, 'sentCount', 1);
    await this.emitProgressAndCheckCompletion(recipient.campaignId);
    await this.dispatchNextRecipient(recipient.campaignId, recipient.batchNumber, recipient.id);
  }

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_DELIVERED)
  async handleMessageDelivered(payload: WhatsAppMessageDeliveredEvent): Promise<void> {
    const recipient = await this.recipientRepo.findByMessageId(payload.messageId);
    if (!recipient) return;

    const updated = await this.recipientRepo.updateStatusIfCurrent(
      recipient.id,
      CampaignRecipientStatus.SENT,
      CampaignRecipientStatus.DELIVERED,
    );
    if (!updated) return;
    await this.campaignRepo.incrementCounter(recipient.campaignId, 'deliveredCount', 1);
    await this.emitProgressAndCheckCompletion(recipient.campaignId);
  }

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_READ)
  async handleMessageRead(payload: WhatsAppMessageReadEvent): Promise<void> {
    const recipient = await this.recipientRepo.findByMessageId(payload.messageId);
    if (!recipient) return;

    // Don't change recipient status — DELIVERED is the terminal success state
    // Just increment read count on the campaign
    await this.campaignRepo.incrementCounter(recipient.campaignId, 'readCount', 1);
    await this.emitProgressAndCheckCompletion(recipient.campaignId);
  }

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_FAILED)
  async handleMessageFailed(payload: WhatsAppMessageFailedEvent): Promise<void> {
    const recipient = await this.recipientRepo.findByMessageId(payload.messageId);
    if (!recipient) return;

    // Only mark as FAILED if this is a permanent failure (dead-lettered)
    // Retries are handled by SendMessageWorker without changing recipient status
    if (payload.retryCount >= 3) {
      const failed = await this.recipientRepo.markFailedIfActive(recipient.id, payload.reason);
      if (!failed) return;
      await this.campaignRepo.incrementCounter(recipient.campaignId, 'failedCount', 1);
      await this.emitProgressAndCheckCompletion(recipient.campaignId);
      await this.dispatchNextRecipient(recipient.campaignId, recipient.batchNumber, recipient.id);
    }
  }

  @OnEvent(EVENT_NAMES.MESSAGE_DEAD_LETTERED)
  async handleMessageDeadLettered(payload: { messageId: string; orgId: string; reason: string; retryCount: number }): Promise<void> {
    const recipient = await this.recipientRepo.findByMessageId(payload.messageId);
    if (!recipient) return;

    // Both failure events may arrive for the same dead-lettered message.
    const failed = await this.recipientRepo.markFailedIfActive(recipient.id, payload.reason);
    if (!failed) return;
    await this.campaignRepo.incrementCounter(recipient.campaignId, 'failedCount', 1);
    await this.emitProgressAndCheckCompletion(recipient.campaignId);
    await this.dispatchNextRecipient(recipient.campaignId, recipient.batchNumber, recipient.id);
  }

  // ─── Campaign lifecycle → WebSocket broadcasts ───

  @OnEvent(EVENT_NAMES.CAMPAIGN_STARTED)
  async handleCampaignStarted(payload: CampaignStartedEvent): Promise<void> {
    this.wsGateway.emitToOrg(payload.orgId, 'campaign:started', payload);
  }

  @OnEvent(EVENT_NAMES.CAMPAIGN_PAUSED)
  async handleCampaignPaused(payload: CampaignPausedEvent): Promise<void> {
    this.wsGateway.emitToOrg(payload.orgId, 'campaign:paused', payload);
  }

  @OnEvent(EVENT_NAMES.CAMPAIGN_RESUMED)
  async handleCampaignResumed(payload: CampaignResumedEvent): Promise<void> {
    this.wsGateway.emitToOrg(payload.orgId, 'campaign:resumed', payload);
  }

  @OnEvent(EVENT_NAMES.CAMPAIGN_COMPLETED)
  async handleCampaignCompleted(payload: CampaignCompletedEvent): Promise<void> {
    this.wsGateway.emitToOrg(payload.orgId, 'campaign:completed', payload);
  }

  @OnEvent(EVENT_NAMES.CAMPAIGN_FAILED)
  async handleCampaignFailed(payload: CampaignFailedEvent): Promise<void> {
    this.wsGateway.emitToOrg(payload.orgId, 'campaign:failed', payload);
  }

  @OnEvent(EVENT_NAMES.CAMPAIGN_CANCELLED)
  async handleCampaignCancelled(payload: CampaignCancelledEvent): Promise<void> {
    this.wsGateway.emitToOrg(payload.orgId, 'campaign:cancelled', payload);
  }

  @OnEvent(EVENT_NAMES.CAMPAIGN_PROGRESS)
  async handleCampaignProgress(payload: CampaignProgressEvent): Promise<void> {
    this.wsGateway.emitToOrg(payload.orgId, 'campaign:progress', payload);
  }

  // ─── Helper: emit progress + check completion ───

  private async emitProgressAndCheckCompletion(campaignId: string): Promise<void> {
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) return;

    // Emit progress update
    this.eventEmitter.emit(EVENT_NAMES.CAMPAIGN_PROGRESS, {
      campaignId,
      orgId: campaign.orgId,
      totalRecipients: campaign.totalRecipients,
      sentCount: campaign.sentCount,
      deliveredCount: campaign.deliveredCount,
      failedCount: campaign.failedCount,
      readCount: campaign.readCount,
    } as CampaignProgressEvent);

    // Check if all recipients are in terminal state
    if (campaign.status !== CampaignStatus.RUNNING) return;

    const counts = await this.recipientRepo.countByStatus(campaignId);
    const pending = counts.pending + counts.queued;

    if (pending === 0) {
      const transitioned = await this.campaignRepo.transitionStatus(
        campaignId,
        CampaignStatus.RUNNING,
        CampaignStatus.COMPLETED,
        { completedAt: new Date() },
      );

      if (transitioned) {
        await this.campaignRepo.recordEvent({
          campaignId,
          orgId: campaign.orgId,
          previousStatus: CampaignStatus.RUNNING,
          newStatus: CampaignStatus.COMPLETED,
          metadata: {
            totalRecipients: campaign.totalRecipients,
            sentCount: campaign.sentCount,
            failedCount: campaign.failedCount,
          },
        });

        this.eventEmitter.emit(EVENT_NAMES.CAMPAIGN_COMPLETED, {
          campaignId,
          orgId: campaign.orgId,
          totalRecipients: campaign.totalRecipients,
          sentCount: campaign.sentCount,
          failedCount: campaign.failedCount,
        } as CampaignCompletedEvent);

        this.logger.log(
          `Campaign ${campaignId} completed: ${campaign.sentCount} sent, ${campaign.failedCount} failed`,
        );
      }

    }
  }

  private async dispatchNextRecipient(
    campaignId: string,
    batchNumber: number,
    completedRecipientId: string,
  ): Promise<void> {
    const campaign = await this.campaignRepo.findById(campaignId);
    if (
      !campaign ||
      campaign.status !== CampaignStatus.RUNNING ||
      (await this.recipientRepo.hasQueuedRecipients(campaignId, batchNumber))
    ) {
      return;
    }

    await this.queueService.publishOnce(
      QUEUE_NAMES.CAMPAIGN_BATCH,
      { campaignId, orgId: campaign.orgId, batchNumber },
      `campaign-next-recipient-${campaignId}-${batchNumber}-${completedRecipientId}`,
    );
  }
}
