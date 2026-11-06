import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { CampaignRepository } from '@/modules/campaigns/infrastructure/repositories/campaign.repository';
import { CampaignRecipientRepository } from '@/modules/campaigns/infrastructure/repositories/campaign-recipient.repository';
import { MessageRepository } from '@/modules/messages/infrastructure/repositories/message.repository';
import { ConversationRepository } from '@/modules/messages/infrastructure/repositories/conversation.repository';
import { MessageEventRepository } from '@/modules/messages/infrastructure/repositories/message-event.repository';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { KillSwitchService } from '@/modules/billing/domain/services/kill-switch.service';
import { pauseCampaignForKillSwitch } from './kill-switch-pause';
import { fillContactPlaceholders } from '@/shared/utils/contact-placeholders';
import {
  QUEUE_NAMES,
  CAMPAIGN_CONFIG,
  MESSAGING_CONFIG,
  EVENT_NAMES,
} from '@/common/constants';
import { OrgEmailService } from '@/modules/email/application/services/org-email.service';
import { CampaignBatchDispatcher } from '@/modules/campaigns/application/services/campaign-batch-dispatcher.service';
import {
  CampaignRecipientStatus,
  CampaignStatus,
  MessageDirection,
  MessageStatus,
  MessageType,
} from '@prisma/client';

interface CampaignBatchJobData {
  campaignId: string;
  orgId: string;
  /** Older jobs may omit the batch number; they are expanded into batch jobs. */
  batchNumber?: number;
}

@Injectable()
export class CampaignBatchWorker implements OnModuleInit {
  private readonly logger = new Logger(CampaignBatchWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly campaignRepo: CampaignRepository,
    private readonly recipientRepo: CampaignRecipientRepository,
    private readonly messageRepo: MessageRepository,
    private readonly conversationRepo: ConversationRepository,
    private readonly messageEventRepo: MessageEventRepository,
    private readonly prisma: PrismaService,
    private readonly killSwitches: KillSwitchService,
    private readonly eventEmitter: EventEmitter2,
    private readonly orgEmail: OrgEmailService,
    private readonly batchDispatcher: CampaignBatchDispatcher,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribeConcurrent<CampaignBatchJobData>(
      QUEUE_NAMES.CAMPAIGN_BATCH,
      async (job) => this.handle(job.data, job.id),
      CAMPAIGN_CONFIG.WORKER_CONCURRENCY,
    );
    this.logger.log(
      `CampaignBatchWorker subscribed (concurrency=${CAMPAIGN_CONFIG.WORKER_CONCURRENCY})`,
    );
  }

  private async handle(data: CampaignBatchJobData, jobId: string): Promise<void> {
    const { campaignId, orgId, batchNumber } = data;
    const batchLabel = batchNumber ? ` batch ${batchNumber}` : '';

    // 1. Load campaign, verify still RUNNING
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      this.logger.warn(`Campaign ${campaignId} not found, skipping${batchLabel}`);
      return;
    }

    if (campaign.status !== CampaignStatus.RUNNING) {
      this.logger.log(
        `Campaign ${campaignId} is ${campaign.status}, skipping${batchLabel}`,
      );
      return;
    }

    // Platform kill switch: pause the campaign; this batch's recipients stay
    // PENDING and are re-dispatched when the campaign is resumed.
    if (await this.killSwitches.isDisabled('campaigns')) {
      await pauseCampaignForKillSwitch(this.campaignRepo, campaignId, orgId, this.eventEmitter);
      this.logger.warn(
        `Campaigns switched off platform-wide — paused campaign ${campaignId}${batchLabel} left pending`,
      );
      return;
    }

    // Older campaign jobs didn't identify a batch; fan them out to the pending
    // batches instead of accidentally running a campaign-wide recipient pump.
    if (batchNumber === undefined) {
      await this.batchDispatcher.dispatch(campaignId, orgId, campaign.channel);
      return;
    }

    // Claim one recipient at a time within this batch. Batches on other numbers
    // send at the same time; this number's next batch starts when this one settles.
    const isEmail = campaign.channel === 'EMAIL';
    while (true) {
      if (await this.killSwitches.isDisabled('campaigns')) {
        await pauseCampaignForKillSwitch(this.campaignRepo, campaignId, orgId, this.eventEmitter);
        return;
      }

      const recipient = await this.recipientRepo.claimNextPending(campaignId, batchNumber);
      if (!recipient) {
        if (!(await this.recipientRepo.hasQueuedRecipients(campaignId, batchNumber))) {
          this.eventEmitter.emit(EVENT_NAMES.CAMPAIGN_BATCH_SETTLED, { campaignId, orgId, batchNumber });
        }
        return;
      }

      let waitingForOutcome = false;
      try {
        const sessionId = recipient.sessionId ?? campaign.sessionId;
        if (!isEmail && !sessionId) {
          throw new Error(`No WhatsApp session is assigned to batch ${batchNumber}`);
        }
        waitingForOutcome = isEmail
          ? await this.processEmailRecipient(recipient, campaign, orgId)
          : await this.processRecipient(recipient, campaign, sessionId!, orgId);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Campaign ${campaignId} recipient ${recipient.id} failed: ${reason}`,
        );

        if (await this.recipientRepo.markFailedIfActive(recipient.id, reason)) {
          await this.campaignRepo.incrementCounter(campaignId, 'failedCount', 1);
        }
      }

      if (waitingForOutcome) return;
    }
  }

  /**
   * Email campaigns: the email goes from the workspace's mailbox. A contact with no
   * email or who unsubscribed is SKIPPED with the reason; otherwise the recipient is
   * QUEUED and the email's result (sent / failed) updates it later.
   */
  private async processEmailRecipient(recipient: Record<string, any>, campaign: Record<string, any>, orgId: string): Promise<boolean> {
    const result = await this.orgEmail.queue({
      orgId,
      contactId: recipient.contactId,
      subject: campaign.emailSubject ?? campaign.name,
      body: campaign.messageBody ?? '',
      source: 'CAMPAIGN',
      sourceId: campaign.id,
      idempotencyKey: `campaign-email-${campaign.id}-${recipient.contactId}`,
    });
    if (result.status === 'SKIPPED') {
      await this.recipientRepo.updateStatus(recipient.id, CampaignRecipientStatus.SKIPPED, {
        emailMessageId: result.emailMessageId,
        failedReason: result.reason,
        processedAt: new Date(),
      });
      return false;
    }
    if (result.status === 'FAILED') {
      if (await this.recipientRepo.markFailedIfActive(recipient.id, result.reason ?? 'Email failed')) {
        await this.campaignRepo.incrementCounter(campaign.id, 'failedCount', 1);
      }
      return false;
    }
    await this.recipientRepo.updateStatus(
      recipient.id,
      result.status === 'SENT' ? CampaignRecipientStatus.SENT : CampaignRecipientStatus.QUEUED,
      { emailMessageId: result.emailMessageId, ...(result.reason ? { failedReason: result.reason } : {}) },
    );
    if (result.status === 'SENT') {
      await this.campaignRepo.incrementCounter(campaign.id, 'sentCount', 1);
      return false;
    }
    return true;
  }

  private async processRecipient(
    recipient: Record<string, any>,
    campaign: Record<string, any>,
    sessionId: string,
    orgId: string,
  ): Promise<boolean> {
    // Re-check contact validity (not deleted, not opted out)
    const contact = await this.prisma.contact.findFirst({
      where: {
        id: recipient.contactId,
        orgId,
        deletedAt: null,
      },
      select: { id: true, optedOut: true, phoneNumber: true, name: true, email: true, leadStatus: true },
    });

    if (!contact) {
      await this.recipientRepo.updateStatus(
        recipient.id,
        CampaignRecipientStatus.SKIPPED,
        {
          failedReason: 'Contact not found or deleted',
          processedAt: new Date(),
        },
      );
      return false;
    }

    if (contact.optedOut) {
      await this.recipientRepo.updateStatus(
        recipient.id,
        CampaignRecipientStatus.SKIPPED,
        {
          failedReason: 'Contact opted out',
          processedAt: new Date(),
        },
      );
      return false;
    }

    // Find or create conversation
    const conversation = await this.conversationRepo.findOrCreate({
      orgId,
      sessionId,
      contactPhone: recipient.contactPhone,
      contactId: recipient.contactId,
      preserveSession: true,
    });

    // Create message with campaign-scoped idempotency key
    const idempotencyKey = `campaign-${campaign.id}-${recipient.contactId}`;

    // Check idempotency — message may already exist from a previous attempt
    const existingMessage = await this.messageRepo.findByIdempotencyKey(idempotencyKey);
    if (existingMessage) {
      if (
        existingMessage.status === MessageStatus.SENT ||
        existingMessage.status === MessageStatus.DELIVERED ||
        existingMessage.status === MessageStatus.READ
      ) {
        await this.recipientRepo.updateStatus(
          recipient.id,
          existingMessage.status === MessageStatus.SENT
            ? CampaignRecipientStatus.SENT
            : CampaignRecipientStatus.DELIVERED,
          { messageId: existingMessage.id, processedAt: new Date() },
        );
        return false;
      }

      if (existingMessage.status === MessageStatus.FAILED) {
        const reason = existingMessage.failedReason ?? 'Message previously failed';
        if (await this.recipientRepo.markFailedIfActive(recipient.id, reason)) {
          await this.campaignRepo.incrementCounter(campaign.id, 'failedCount', 1);
        }
        return false;
      }

      await this.recipientRepo.updateStatus(recipient.id, CampaignRecipientStatus.QUEUED, {
        messageId: existingMessage.id,
      });
      return true;
    }

    // Fill contact details, the same way as sequences and automations (no saved name → "there")
    const resolvedBody = campaign.messageBody ? fillContactPlaceholders(campaign.messageBody, contact) : null;

    // Create new message record
    const message = await this.messageRepo.create({
      orgId,
      sessionId,
      conversationId: conversation.id,
      direction: MessageDirection.OUTBOUND,
      type: campaign.messageType as MessageType,
      contactPhone: recipient.contactPhone,
      body: resolvedBody ?? undefined,
      mediaUrl: campaign.mediaUrl || null,
      mediaMimeType: campaign.mediaMimeType || null,
      idempotencyKey,
      priority: CAMPAIGN_CONFIG.CAMPAIGN_MESSAGE_PRIORITY,
      maxRetries: MESSAGING_CONFIG.MAX_RETRY_COUNT,
      metadata: { campaignId: campaign.id, batchNumber: recipient.batchNumber },
    });

    // Record message event
    await this.messageEventRepo.record({
      messageId: message.id,
      orgId,
      status: MessageStatus.QUEUED,
      metadata: { campaignId: campaign.id },
    });

    // Link message to recipient and mark as QUEUED
    await this.recipientRepo.updateStatus(
      recipient.id,
      CampaignRecipientStatus.QUEUED,
      { messageId: message.id },
    );

    // Publish to the existing send-whatsapp-message queue
    await this.queueService.publishOnce(
      QUEUE_NAMES.SEND_WHATSAPP_MESSAGE,
      {
        messageId: message.id,
        sessionId,
        orgId,
      },
      `msg-${message.id}`,
      {
        retryLimit: MESSAGING_CONFIG.MAX_RETRY_COUNT,
        retryDelay: MESSAGING_CONFIG.RETRY_BASE_DELAY_SECONDS,
        retryBackoff: true,
        priority: CAMPAIGN_CONFIG.CAMPAIGN_MESSAGE_PRIORITY,
      },
    );

    // Update conversation last message (the text this contact got, not the raw template)
    await this.conversationRepo.updateLastMessage(
      conversation.id,
      resolvedBody,
      false,
    );
    return true;
  }
}
