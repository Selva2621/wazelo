import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeveloperApiRepository } from '../../infrastructure/repositories/developer-api.repository';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { UsageTrackingService } from '@/modules/billing/domain/services/usage-tracking.service';
import { QUEUE_NAMES, EVENT_NAMES } from '@/common/constants';
import { MessageDirection, MessageStatus, MessageType, UsageMetricType } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { DevSendMessageDto } from '../dto';

@Injectable()
export class DevSendMessageUseCase {
  private readonly logger = new Logger(DevSendMessageUseCase.name);

  constructor(
    private readonly repo: DeveloperApiRepository,
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly usageTracking: UsageTrackingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(orgId: string, dto: DevSendMessageDto) {
    // 1. Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.prisma.message.findFirst({
        where: { idempotencyKey: dto.idempotencyKey, orgId },
        select: { id: true, status: true, createdAt: true },
      });
      if (existing) {
        return { message: existing, deduplicated: true };
      }
    }

    // 2. Check usage limits
    const usageCheck = await this.usageTracking.checkUsage(orgId, UsageMetricType.MESSAGES_SENT);
    if (!usageCheck.allowed) {
      throw new BadRequestException({
        error: 'USAGE_LIMIT_EXCEEDED',
        message: 'Message limit reached for your current plan. Please upgrade.',
        details: {
          used: usageCheck.currentValue,
          limit: usageCheck.limitValue,
        },
      });
    }

    // 3. Find a connected WhatsApp session for this org
    const session = dto.userId
      ? await this.repo.getSessionByUserAndOrg(orgId, dto.userId)
      : await this.repo.getFirstConnectedSession(orgId);
    if (!session) {
      throw new BadRequestException(
        dto.userId
          ? 'No connected WhatsApp session for the specified user.'
          : 'No connected WhatsApp session. Please connect WhatsApp first.',
      );
    }

    // 4. Auto-create or find contact
    const contactResult = await this.repo.createContact({
      orgId,
      name: dto.to,
      phoneNumber: dto.to,
    });

    // 5. Find or create conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: { orgId, contactId: contactResult.contact.id, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          orgId,
          contactId: contactResult.contact.id,
          contactPhone: dto.to,
          sessionId: session.id,
          status: 'OPEN',
          lastMessageAt: new Date(),
        },
      });
    }

    // 6. Create message record
    const messageType = dto.type.toUpperCase() as MessageType;
    const message = await this.prisma.message.create({
      data: {
        orgId,
        conversationId: conversation.id,
        sessionId: session.id,
        direction: MessageDirection.OUTBOUND,
        type: messageType,
        body: dto.body,
        mediaUrl: dto.mediaUrl,
        contactPhone: dto.to,
        status: MessageStatus.QUEUED,
        idempotencyKey: dto.idempotencyKey,
        metadata: dto.interactive ? { interactive: dto.interactive as any } : undefined,
      },
    });

    // 7. Create message event
    await this.prisma.messageEvent.create({
      data: {
        messageId: message.id,
        orgId,
        status: MessageStatus.QUEUED,
      },
    });

    // 8. Queue the message for sending
    await this.queueService.publish(QUEUE_NAMES.SEND_WHATSAPP_MESSAGE, {
      messageId: message.id,
      sessionId: session.id,
      orgId,
      contactPhone: dto.to,
      type: messageType,
      body: dto.body,
      mediaUrl: dto.mediaUrl,
      interactive: dto.interactive,
    });

    // 9. Increment usage
    await this.usageTracking.incrementUsage(orgId, UsageMetricType.MESSAGES_SENT);

    // 10. Emit event
    this.eventEmitter.emit(EVENT_NAMES.MESSAGE_QUEUED, {
      messageId: message.id,
      orgId,
      contactPhone: dto.to,
      source: 'developer-api',
    });

    this.logger.log(`Developer API: Message ${message.id} queued for ${dto.to} in org ${orgId}`);

    return {
      message: {
        id: message.id,
        to: dto.to,
        type: dto.type,
        status: 'QUEUED',
        createdAt: message.createdAt,
      },
      deduplicated: false,
    };
  }
}
