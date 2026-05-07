import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ChannelType,
  MessageDirection,
  MessageStatus,
} from '@prisma/client';
import { InboundMessagePayload } from '@/modules/channels/domain/interfaces/channel-adapter.interface';
import { ChannelService } from '@/modules/channels/domain/services/channel.service';
import { MessageEncryptionService } from '@/modules/messages/domain/services/message-encryption.service';
import {
  QUEUE_NAMES,
  EVENT_NAMES,
  CHANNEL_CONFIG,
} from '@/common/constants';

interface ProcessChannelInboundJobData {
  channelId: string;
  channelType: string;
  orgId: string;
  payload: InboundMessagePayload;
}

@Injectable()
export class ProcessChannelInboundWorker implements OnModuleInit {
  private readonly logger = new Logger(
    ProcessChannelInboundWorker.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly channelService: ChannelService,
    private readonly eventEmitter: EventEmitter2,
    private readonly enc: MessageEncryptionService,
  ) {}

  async onModuleInit() {
    await this.queueService.subscribeConcurrent<ProcessChannelInboundJobData>(
      QUEUE_NAMES.PROCESS_CHANNEL_INBOUND,
      async (job) => this.handle(job.data, job.id),
      CHANNEL_CONFIG.WORKER_CONCURRENCY,
    );

    this.logger.log('ProcessChannelInboundWorker subscribed');
  }

  private async handle(
    data: ProcessChannelInboundJobData,
    jobId: string,
  ): Promise<void> {
    const { channelId, channelType, orgId, payload } = data;

    // 1. Deduplication by externalMessageId
    const existing = await this.prisma.message.findUnique({
      where: { externalMessageId: payload.externalMessageId },
    });

    if (existing) {
      this.logger.debug(
        `Duplicate inbound message ${payload.externalMessageId}, skipping`,
      );
      return;
    }

    // 2. Find or create conversation (upsert by channel + contact)
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        orgId,
        channelId,
        contactIdentifier: payload.senderIdentifier,
        deletedAt: null,
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    if (conversation) {
      conversation = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: payload.timestamp,
          lastMessageBody: this.enc.encryptIfPresent(
            payload.body?.substring(0, 500) || `[${payload.type}]`,
          ),
          unreadCount: { increment: 1 },
          status: 'OPEN', // Re-open if closed
          updatedAt: new Date(),
        },
      });
    } else {
      conversation = await this.prisma.conversation.create({
        data: {
          orgId,
          channelId,
          channelType: channelType as ChannelType,
          contactIdentifier: payload.senderIdentifier,
          contactPhone: payload.senderIdentifier,
          status: 'OPEN',
          lastMessageAt: payload.timestamp,
          lastMessageBody: this.enc.encryptIfPresent(
            payload.body?.substring(0, 500) || `[${payload.type}]`,
          ),
          unreadCount: 1,
        },
      });

      this.eventEmitter.emit(EVENT_NAMES.CONVERSATION_CREATED, {
        conversationId: conversation.id,
        orgId,
        channelId,
        channelType,
        contactPhone: payload.senderIdentifier,
      });
    }

    // 3. Create message
    const message = await this.prisma.message.create({
      data: {
        orgId,
        channelId,
        channelType: channelType as ChannelType,
        conversationId: conversation.id,
        direction: MessageDirection.INBOUND,
        type: payload.type,
        status: MessageStatus.DELIVERED,
        contactPhone: payload.senderIdentifier,
        contactName: payload.senderName,
        body: payload.body,
        mediaUrl: payload.mediaUrl,
        mediaMimeType: payload.mediaMimeType,
        mediaSize: payload.mediaSize,
        externalMessageId: payload.externalMessageId,
        channelPayload: (payload.channelPayload as any) || undefined,
        sentAt: payload.timestamp,
        deliveredAt: new Date(),
      },
    });

    // 4. Record message event
    await this.prisma.messageEvent.create({
      data: {
        messageId: message.id,
        orgId,
        status: MessageStatus.DELIVERED,
        metadata: { jobId, channelId, channelType },
      },
    });

    // 5. Update channel lastActiveAt
    await this.channelService.updateLastActive(channelId);

    // 6. Emit events
    this.eventEmitter.emit(EVENT_NAMES.CHANNEL_MESSAGE_RECEIVED, {
      orgId,
      messageId: message.id,
      channelId,
      channelType,
      conversationId: conversation.id,
      senderIdentifier: payload.senderIdentifier,
      senderName: payload.senderName,
    });

    // Trigger contact auto-creation (reuses existing handler)
    this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_MESSAGE_RECEIVED, {
      orgId,
      messageId: message.id,
      contactPhone: payload.senderIdentifier,
      contactName: payload.senderName,
      channelType,
      conversationId: conversation.id,
    });

    this.eventEmitter.emit(EVENT_NAMES.CONVERSATION_UPDATED, {
      conversationId: conversation.id,
      orgId,
      lastMessageAt: payload.timestamp,
      lastMessageBody:
        payload.body?.substring(0, 500) || `[${payload.type}]`,
      unreadCount: conversation.unreadCount,
    });

    // Enqueue SLA evaluation for inbound channel message
    await this.queueService.publishOnce(
      QUEUE_NAMES.SLA_EVALUATE,
      {
        type: 'inbound_message',
        orgId,
        conversationId: conversation.id,
        sessionId: channelId,
        assignedUserId: conversation.assignedToId ?? null,
        messageCreatedAt: new Date().toISOString(),
      },
      `sla:inbound:${message.id}`,
    );

    this.logger.debug(
      `Processed inbound ${channelType} message ${message.id} for conversation ${conversation.id}`,
    );
  }
}
