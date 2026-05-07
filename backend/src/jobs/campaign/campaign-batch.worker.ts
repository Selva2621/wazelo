import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { CampaignRepository } from '@/modules/campaigns/infrastructure/repositories/campaign.repository';
import { CampaignRecipientRepository } from '@/modules/campaigns/infrastructure/repositories/campaign-recipient.repository';
import { MessageRepository } from '@/modules/messages/infrastructure/repositories/message.repository';
import { ConversationRepository } from '@/modules/messages/infrastructure/repositories/conversation.repository';
import { MessageEventRepository } from '@/modules/messages/infrastructure/repositories/message-event.repository';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import {
  QUEUE_NAMES,
  CAMPAIGN_CONFIG,
  MESSAGING_CONFIG,
} from '@/common/constants';
import {
  CampaignRecipientStatus,
  CampaignStatus,
  MessageDirection,
  MessageStatus,
  MessageType,
} from '@prisma/client';

interface CampaignBatchJobData {
  campaignId: string;
  batchNumber: number;
  orgId: string;
  sessionId: string;
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
    const { campaignId, batchNumber, orgId, sessionId } = data;

    // 1. Load campaign, verify still RUNNING
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      this.logger.warn(`Campaign ${campaignId} not found, skipping batch ${batchNumber}`);
      return;
    }

    if (campaign.status !== CampaignStatus.RUNNING) {
      this.logger.log(
        `Campaign ${campaignId} is ${campaign.status}, skipping batch ${batchNumber}`,
      );
      return;
    }

    // 2. Load PENDING recipients for this batch
    const recipients = await this.recipientRepo.findPendingByBatch(campaignId, batchNumber);
    if (recipients.length === 0) {
      this.logger.log(`Campaign ${campaignId} batch ${batchNumber}: no pending recipients`);
      return;
    }

    this.logger.log(
      `Campaign ${campaignId} batch ${batchNumber}: processing ${recipients.length} recipients`,
    );

    // 3. Process each recipient
    for (const recipient of recipients) {
      try {
        await this.processRecipient(recipient, campaign, sessionId, orgId);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Campaign ${campaignId} recipient ${recipient.id} failed: ${reason}`,
        );

        await this.recipientRepo.updateStatus(
          recipient.id,
          CampaignRecipientStatus.FAILED,
          {
            failedReason: reason,
            processedAt: new Date(),
          },
        );

        await this.campaignRepo.incrementCounter(campaignId, 'failedCount', 1);
      }
    }
  }

  private async processRecipient(
    recipient: Record<string, any>,
    campaign: Record<string, any>,
    sessionId: string,
    orgId: string,
  ): Promise<void> {
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
      return;
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
      return;
    }

    // Find or create conversation
    const conversation = await this.conversationRepo.findOrCreate({
      orgId,
      sessionId,
      contactPhone: recipient.contactPhone,
    });

    // Create message with campaign-scoped idempotency key
    const idempotencyKey = `campaign-${campaign.id}-${recipient.contactId}`;

    // Check idempotency — message may already exist from a previous attempt
    const existingMessage = await this.messageRepo.findByIdempotencyKey(idempotencyKey);
    if (existingMessage) {
      // Link and mark as queued (already in pipeline)
      await this.recipientRepo.updateStatus(
        recipient.id,
        CampaignRecipientStatus.QUEUED,
        { messageId: existingMessage.id },
      );
      return;
    }

    // Interpolate template variables in message body
    const resolvedBody = campaign.messageBody
      ? campaign.messageBody.replace(/\{\{([\w.]+)\}\}/g, (_: string, key: string) => {
          const vars: Record<string, string> = {
            name: contact.name ?? '',
            phone: contact.phoneNumber,
            email: contact.email ?? '',
            leadStatus: contact.leadStatus ?? '',
            'contact.name': contact.name ?? '',
            'contact.phone': contact.phoneNumber,
            'contact.email': contact.email ?? '',
            'contact.leadStatus': contact.leadStatus ?? '',
          };
          return vars[key] ?? `{{${key}}}`;
        })
      : null;

    // Create new message record
    const message = await this.messageRepo.create({
      orgId,
      sessionId,
      conversationId: conversation.id,
      direction: MessageDirection.OUTBOUND,
      type: campaign.messageType as MessageType,
      contactPhone: recipient.contactPhone,
      body: resolvedBody,
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

    // Update conversation last message
    await this.conversationRepo.updateLastMessage(
      conversation.id,
      campaign.messageBody || null,
      false,
    );
  }
}
