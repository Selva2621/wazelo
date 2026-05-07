import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ChannelType,
  ChannelStatus,
  MessageDirection,
  MessageStatus,
  MessageType,
} from '@prisma/client';
import { ChannelService } from '../../domain/services/channel.service';
import { ChannelAdapterRegistry } from '../../domain/services/channel-adapter-registry';
import { EncryptionService } from '@/common/services';
import { MessageEncryptionService } from '@/modules/messages/domain/services/message-encryption.service';
import { QUEUE_NAMES, EVENT_NAMES } from '@/common/constants';

export interface SendChannelMessageParams {
  orgId: string;
  userId: string;
  channelId?: string;
  sessionId?: string; // backward compat
  conversationId?: string;
  contactIdentifier: string;
  type?: MessageType;
  body?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaSize?: number;
  idempotencyKey?: string;
  channelPayload?: Record<string, unknown>;
  priority?: number;
}

@Injectable()
export class SendChannelMessageUseCase {
  private readonly logger = new Logger(SendChannelMessageUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly channelService: ChannelService,
    private readonly adapterRegistry: ChannelAdapterRegistry,
    private readonly eventEmitter: EventEmitter2,
    private readonly enc: MessageEncryptionService,
  ) {}

  async execute(params: SendChannelMessageParams) {
    const {
      orgId,
      userId,
      channelId,
      sessionId,
      conversationId,
      contactIdentifier,
      body,
      mediaUrl,
      mediaMimeType,
      mediaSize,
      idempotencyKey,
      channelPayload,
      priority,
    } = params;
    const messageType = params.type || MessageType.TEXT;

    // 1. Idempotency check
    if (idempotencyKey) {
      const existing = await this.prisma.message.findUnique({
        where: { idempotencyKey },
      });
      if (existing) return existing;
    }

    // 2. Resolve channel
    const channel = await this.resolveChannel(
      orgId,
      channelId,
      sessionId,
      conversationId,
    );

    if (channel.status !== ChannelStatus.ACTIVE) {
      throw new BadRequestException(
        `Channel "${channel.name}" is not active (status: ${channel.status})`,
      );
    }

    // 3. Validate message type against channel capabilities
    const capabilities = channel.capabilities as any;
    if (
      capabilities?.supportedMessageTypes &&
      !capabilities.supportedMessageTypes.includes(messageType)
    ) {
      throw new BadRequestException(
        `Message type ${messageType} is not supported by ${channel.type}. ` +
          `Supported: ${capabilities.supportedMessageTypes.join(', ')}`,
      );
    }

    // 4. Validate content
    this.validateContent(messageType, body, mediaUrl, channel.type, channelPayload);

    // 5. Rate limit check
    await this.channelService.checkRateLimit(
      channel.id,
      orgId,
      channel.rateLimitPerMin,
    );

    // 6. Find or create conversation
    const conversation = await this.findOrCreateConversation(
      orgId,
      channel.id,
      channel.type,
      contactIdentifier,
      conversationId,
    );

    // 7. Create message
    const message = await this.prisma.message.create({
      data: {
        orgId,
        channelId: channel.id,
        channelType: channel.type,
        sessionId: channel.legacySessionId,
        conversationId: conversation.id,
        direction: MessageDirection.OUTBOUND,
        type: messageType,
        status: MessageStatus.QUEUED,
        contactPhone: contactIdentifier,
        body,
        mediaUrl,
        mediaMimeType,
        mediaSize,
        idempotencyKey,
        channelPayload: channelPayload as any,
        priority: priority || 0,
        maxRetries: 3,
      },
    });

    // 8. Record message event
    await this.prisma.messageEvent.create({
      data: {
        messageId: message.id,
        orgId,
        status: MessageStatus.QUEUED,
        metadata: {
          channelId: channel.id,
          channelType: channel.type,
          userId,
        },
      },
    });

    // 9. Queue for async send
    await this.queueService.publish(
      QUEUE_NAMES.SEND_CHANNEL_MESSAGE,
      {
        messageId: message.id,
        channelId: channel.id,
        channelType: channel.type,
        orgId,
      },
      {
        singletonKey: `msg-${message.id}`,
        priority: priority || 0,
      },
    );

    // 10. Update conversation
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        lastMessageBody: this.enc.encryptIfPresent(
          body?.substring(0, 500) || `[${messageType}]`,
        ),
        updatedAt: new Date(),
      },
    });

    // 11. Emit event
    this.eventEmitter.emit(EVENT_NAMES.MESSAGE_QUEUED, {
      orgId,
      messageId: message.id,
      channelId: channel.id,
      channelType: channel.type,
      conversationId: conversation.id,
      contactPhone: contactIdentifier,
      type: messageType,
    });

    return message;
  }

  private validateContent(
    messageType: MessageType,
    body: string | undefined,
    mediaUrl: string | undefined,
    channelType: ChannelType,
    channelPayload?: Record<string, unknown>,
  ): void {
    if (messageType === MessageType.TEXT && !body) {
      throw new BadRequestException('Text messages require a body');
    }

    const mediaTypes: MessageType[] = [
      MessageType.IMAGE,
      MessageType.VIDEO,
      MessageType.DOCUMENT,
      MessageType.AUDIO,
    ];
    if (mediaTypes.includes(messageType) && !mediaUrl) {
      throw new BadRequestException(
        `${messageType} messages require a mediaUrl`,
      );
    }

    if (channelType === ChannelType.EMAIL && !channelPayload?.subject) {
      throw new BadRequestException(
        'Email messages require a subject in channelPayload',
      );
    }
  }

  private async resolveChannel(
    orgId: string,
    channelId?: string,
    sessionId?: string,
    conversationId?: string,
  ) {
    // Priority: explicit channelId > conversation's channel > legacy sessionId lookup
    if (channelId) {
      const channel = await this.prisma.channel.findFirst({
        where: { id: channelId, orgId, deletedAt: null },
      });
      if (!channel) throw new NotFoundException('Channel not found');
      return channel;
    }

    if (conversationId) {
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: conversationId, orgId, deletedAt: null },
        include: { channel: true },
      });
      if (conversation?.channel) return conversation.channel;
    }

    // Backward compatibility: resolve from legacy session
    if (sessionId) {
      const channel = await this.prisma.channel.findFirst({
        where: { legacySessionId: sessionId, orgId, deletedAt: null },
      });
      if (channel) return channel;
    }

    throw new BadRequestException(
      'Could not resolve channel. Provide channelId, conversationId, or sessionId.',
    );
  }

  private async findOrCreateConversation(
    orgId: string,
    channelId: string,
    channelType: ChannelType,
    contactIdentifier: string,
    existingConversationId?: string,
  ) {
    if (existingConversationId) {
      const existing = await this.prisma.conversation.findFirst({
        where: {
          id: existingConversationId,
          orgId,
          deletedAt: null,
        },
      });
      if (existing) return existing;
    }

    // Find existing open conversation for this channel + contact
    const existing = await this.prisma.conversation.findFirst({
      where: {
        orgId,
        channelId,
        contactIdentifier,
        status: 'OPEN',
        deletedAt: null,
      },
    });

    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        orgId,
        channelId,
        channelType,
        contactIdentifier,
        contactPhone: contactIdentifier,
        status: 'OPEN',
        lastMessageAt: new Date(),
      },
    });
  }
}
