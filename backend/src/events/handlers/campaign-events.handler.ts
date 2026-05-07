import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CampaignRepository } from '@/modules/campaigns/infrastructure/repositories/campaign.repository';
import { CampaignRecipientRepository } from '@/modules/campaigns/infrastructure/repositories/campaign-recipient.repository';
import { AppWebSocketGateway } from '@/infrastructure/websocket/websocket.gateway';
import { EVENT_NAMES } from '@/common/constants';
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

@Injectable()
export class CampaignEventsHandler {
  private readonly logger = new Logger(CampaignEventsHandler.name);

  constructor(
    private readonly campaignRepo: CampaignRepository,
    private readonly recipientRepo: CampaignRecipientRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly wsGateway: AppWebSocketGateway,
  ) {}

  // ─── Message lifecycle → Campaign progress tracking ───

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_SENT)
  async handleMessageSent(payload: WhatsAppMessageSentEvent): Promise<void> {
    const recipient = await this.recipientRepo.findByMessageId(payload.messageId);
    if (!recipient) return; // Not a campaign message

    await this.recipientRepo.updateStatus(
      recipient.id,
      CampaignRecipientStatus.SENT,
      { processedAt: new Date() },
    );
    await this.campaignRepo.incrementCounter(recipient.campaignId, 'sentCount', 1);
    await this.emitProgressAndCheckCompletion(recipient.campaignId);
  }

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_DELIVERED)
  async handleMessageDelivered(payload: WhatsAppMessageDeliveredEvent): Promise<void> {
    const recipient = await this.recipientRepo.findByMessageId(payload.messageId);
    if (!recipient) return;

    await this.recipientRepo.updateStatus(
      recipient.id,
      CampaignRecipientStatus.DELIVERED,
    );
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
      await this.recipientRepo.updateStatus(
        recipient.id,
        CampaignRecipientStatus.FAILED,
        {
          failedReason: payload.reason,
          processedAt: new Date(),
        },
      );
      await this.campaignRepo.incrementCounter(recipient.campaignId, 'failedCount', 1);
      await this.emitProgressAndCheckCompletion(recipient.campaignId);
    }
  }

  @OnEvent(EVENT_NAMES.MESSAGE_DEAD_LETTERED)
  async handleMessageDeadLettered(payload: { messageId: string; orgId: string; reason: string; retryCount: number }): Promise<void> {
    const recipient = await this.recipientRepo.findByMessageId(payload.messageId);
    if (!recipient) return;

    // Ensure recipient is marked FAILED
    if (recipient.status !== CampaignRecipientStatus.FAILED) {
      await this.recipientRepo.updateStatus(
        recipient.id,
        CampaignRecipientStatus.FAILED,
        {
          failedReason: payload.reason,
          processedAt: new Date(),
        },
      );
      await this.campaignRepo.incrementCounter(recipient.campaignId, 'failedCount', 1);
    }

    await this.emitProgressAndCheckCompletion(recipient.campaignId);
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
}
