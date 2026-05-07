import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MessageStatus, ChannelStatus } from '@prisma/client';
import { ChannelAdapterRegistry } from '@/modules/channels/domain/services/channel-adapter-registry';
import { ChannelService } from '@/modules/channels/domain/services/channel.service';
import {
  QUEUE_NAMES,
  EVENT_NAMES,
  CHANNEL_CONFIG,
} from '@/common/constants';

interface SendChannelMessageJobData {
  messageId: string;
  channelId: string;
  channelType: string;
  orgId: string;
}

const NON_RETRYABLE_PATTERNS = [
  'invalid_phone',
  'recipient_not_found',
  'blocked',
  'banned',
  'media_too_large',
  'unsupported_message_type',
  'account_suspended',
  'EAUTH',
  'EENVELOPE',
];

@Injectable()
export class SendChannelMessageWorker implements OnModuleInit {
  private readonly logger = new Logger(
    SendChannelMessageWorker.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly adapterRegistry: ChannelAdapterRegistry,
    private readonly channelService: ChannelService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    await this.queueService.subscribeConcurrent<SendChannelMessageJobData>(
      QUEUE_NAMES.SEND_CHANNEL_MESSAGE,
      async (job) => this.handle(job.data, job.id),
      CHANNEL_CONFIG.WORKER_CONCURRENCY,
    );

    this.logger.log('SendChannelMessageWorker subscribed');
  }

  private async handle(
    data: SendChannelMessageJobData,
    jobId: string,
  ): Promise<void> {
    const { messageId, channelId, orgId } = data;

    // 1. Load message
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      this.logger.warn(`Message ${messageId} not found, skipping`);
      return;
    }

    // 2. Idempotency: skip if already sent/delivered/read
    const terminalStatuses: MessageStatus[] = [
      MessageStatus.SENT,
      MessageStatus.DELIVERED,
      MessageStatus.READ,
    ];
    if (terminalStatuses.includes(message.status)) {
      this.logger.debug(
        `Message ${messageId} already ${message.status}, skipping`,
      );
      return;
    }

    // 3. Atomic transition QUEUED → PROCESSING
    const updated = await this.prisma.message.updateMany({
      where: { id: messageId, status: MessageStatus.QUEUED },
      data: {
        status: MessageStatus.PROCESSING,
        processingAt: new Date(),
      },
    });

    if (updated.count === 0) {
      this.logger.debug(
        `Message ${messageId} not in QUEUED state, skipping`,
      );
      return;
    }

    // 4. Verify channel is active
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel || channel.status !== ChannelStatus.ACTIVE) {
      await this.failMessage(
        messageId,
        orgId,
        'Channel is not active',
        false,
      );
      return;
    }

    // 5. Get adapter + decrypted config
    const adapter = this.adapterRegistry.getAdapter(channel.type);
    const config = await this.channelService.getDecryptedConfig(
      channelId,
    );

    // 6. Send via adapter
    const result = await adapter.sendMessage(
      {
        channelId,
        externalHandle: channel.externalHandle || '',
        recipientIdentifier: message.contactPhone,
        type: message.type,
        body: message.body || undefined,
        mediaUrl: message.mediaUrl || undefined,
        mediaMimeType: message.mediaMimeType || undefined,
        channelPayload: (message.channelPayload as any) || undefined,
        idempotencyKey: message.idempotencyKey || message.id,
      },
      config,
    );

    if (result.success) {
      // 7a. Success path
      await this.prisma.message.update({
        where: { id: messageId },
        data: {
          status: MessageStatus.SENT,
          externalMessageId: result.externalMessageId,
          sentAt: new Date(),
        },
      });

      await this.prisma.messageEvent.create({
        data: {
          messageId,
          orgId,
          status: MessageStatus.SENT,
          metadata: {
            jobId,
            externalMessageId: result.externalMessageId,
          },
        },
      });

      await this.channelService.updateLastActive(channelId);

      this.eventEmitter.emit(EVENT_NAMES.CHANNEL_MESSAGE_SENT, {
        orgId,
        messageId,
        channelId,
        channelType: channel.type,
        conversationId: message.conversationId,
        externalMessageId: result.externalMessageId,
      });
    } else {
      // 7b. Failure path
      const isNonRetryable =
        !result.retryable ||
        NON_RETRYABLE_PATTERNS.some((p) =>
          result.error?.toLowerCase().includes(p),
        );

      if (!isNonRetryable && message.retryCount < message.maxRetries) {
        const delay = Math.min(
          CHANNEL_CONFIG.RETRY_BASE_DELAY_SECONDS *
            Math.pow(2, message.retryCount),
          CHANNEL_CONFIG.RETRY_MAX_DELAY_SECONDS,
        );

        await this.prisma.message.update({
          where: { id: messageId },
          data: {
            status: MessageStatus.QUEUED,
            retryCount: { increment: 1 },
            nextRetryAt: new Date(Date.now() + delay * 1000),
            failedReason: result.error,
          },
        });

        await this.prisma.messageEvent.create({
          data: {
            messageId,
            orgId,
            status: MessageStatus.QUEUED,
            error: result.error,
            metadata: {
              jobId,
              retry: message.retryCount + 1,
              nextRetryDelay: delay,
            },
          },
        });

        await this.queueService.publishDelayed(
          QUEUE_NAMES.SEND_CHANNEL_MESSAGE,
          data,
          delay,
          { singletonKey: `msg-${messageId}` },
        );

        this.logger.warn(
          `Message ${messageId} failed, retry ${message.retryCount + 1}/${message.maxRetries} in ${delay}s: ${result.error}`,
        );
      } else {
        // Non-retryable or max retries exhausted → dead letter
        await this.failMessage(
          messageId,
          orgId,
          result.error || 'Unknown error',
          true,
        );
      }
    }
  }

  private async failMessage(
    messageId: string,
    orgId: string,
    error: string,
    createDeadLetter: boolean,
  ): Promise<void> {
    await this.prisma.message.update({
      where: { id: messageId },
      data: { status: MessageStatus.FAILED, failedReason: error },
    });

    if (createDeadLetter) {
      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
      });
      if (message) {
        await this.prisma.deadLetterMessage.create({
          data: {
            orgId,
            originalMessageId: messageId,
            sessionId: message.sessionId,
            channelId: message.channelId,
            queueName: QUEUE_NAMES.SEND_CHANNEL_MESSAGE,
            contactPhone: message.contactPhone,
            type: message.type,
            body: message.body,
            mediaUrl: message.mediaUrl,
            failedReason: error,
            retryCount: message.retryCount,
            metadata: {
              channelType: message.channelType,
              channelPayload: message.channelPayload,
            },
          },
        });
      }
    }

    await this.prisma.messageEvent.create({
      data: { messageId, orgId, status: MessageStatus.FAILED, error },
    });

    this.eventEmitter.emit(EVENT_NAMES.CHANNEL_MESSAGE_FAILED, {
      orgId,
      messageId,
      error,
    });

    this.logger.error(
      `Message ${messageId} permanently failed: ${error}`,
    );
  }
}
