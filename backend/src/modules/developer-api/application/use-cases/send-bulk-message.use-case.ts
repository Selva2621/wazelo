import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeveloperApiRepository } from '../../infrastructure/repositories/developer-api.repository';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { UsageTrackingService } from '@/modules/billing/domain/services/usage-tracking.service';
import { QUEUE_NAMES, EVENT_NAMES } from '@/common/constants';
import { MessageDirection, MessageStatus, MessageType, UsageMetricType } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { DevSendBulkMessageDto } from '../dto';

@Injectable()
export class DevSendBulkMessageUseCase {
  private readonly logger = new Logger(DevSendBulkMessageUseCase.name);

  constructor(
    private readonly repo: DeveloperApiRepository,
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly usageTracking: UsageTrackingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(orgId: string, dto: DevSendBulkMessageDto) {
    const recipientCount = dto.to.length;

    // 1. Check usage limits for bulk count
    const usageCheck = await this.usageTracking.checkUsage(orgId, UsageMetricType.MESSAGES_SENT);
    if (!usageCheck.allowed) {
      throw new BadRequestException({
        error: 'USAGE_LIMIT_EXCEEDED',
        message: 'Message limit reached for your current plan. Please upgrade.',
        details: { used: usageCheck.currentValue, limit: usageCheck.limitValue },
      });
    }

    // 2. Find session
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

    const messageType = dto.type.toUpperCase() as MessageType;
    const results: { to: string; messageId: string; status: string }[] = [];

    // 3. Queue each recipient
    for (const to of dto.to) {
      // Auto-create or find contact
      const contactResult = await this.repo.createContact({ orgId, name: to, phoneNumber: to });

      // Find or create conversation
      let conversation = await this.prisma.conversation.findFirst({
        where: { orgId, contactId: contactResult.contact.id, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
      });

      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: {
            orgId,
            contactId: contactResult.contact.id,
            contactPhone: to,
            sessionId: session.id,
            status: 'OPEN',
            lastMessageAt: new Date(),
          },
        });
      }

      // Create message record
      const message = await this.prisma.message.create({
        data: {
          orgId,
          conversationId: conversation.id,
          sessionId: session.id,
          direction: MessageDirection.OUTBOUND,
          type: messageType,
          body: dto.body,
          mediaUrl: dto.mediaUrl,
          contactPhone: to,
          status: MessageStatus.QUEUED,
        },
      });

      await this.prisma.messageEvent.create({
        data: { messageId: message.id, orgId, status: MessageStatus.QUEUED },
      });

      await this.queueService.publish(QUEUE_NAMES.SEND_WHATSAPP_MESSAGE, {
        messageId: message.id,
        sessionId: session.id,
        orgId,
        contactPhone: to,
        type: messageType,
        body: dto.body,
        mediaUrl: dto.mediaUrl,
      });

      results.push({ to, messageId: message.id, status: 'QUEUED' });
    }

    // 4. Increment usage for all messages
    for (let i = 0; i < recipientCount; i++) {
      await this.usageTracking.incrementUsage(orgId, UsageMetricType.MESSAGES_SENT);
    }

    this.eventEmitter.emit(EVENT_NAMES.MESSAGE_QUEUED, {
      orgId,
      source: 'developer-api-bulk',
      count: recipientCount,
    });

    this.logger.log(`Developer API: Bulk ${recipientCount} messages queued in org ${orgId}`);

    return { queued: recipientCount, messages: results };
  }
}
