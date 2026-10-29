import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeveloperApiRepository } from '../../infrastructure/repositories/developer-api.repository';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { UsageTrackingService } from '@/modules/billing/domain/services/usage-tracking.service';
import { QUEUE_NAMES, EVENT_NAMES, CAMPAIGN_CONFIG } from '@/common/constants';
import { MessageDirection, MessageStatus, MessageType, UsageMetricType } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { MessageRepository } from '@/modules/messages/infrastructure/repositories/message.repository';
import { DevSendBulkMessageDto } from '../dto';
import { OrgLocaleService } from '@/modules/org/domain/services/org-locale.service';

@Injectable()
export class DevSendBulkMessageUseCase {
  private readonly logger = new Logger(DevSendBulkMessageUseCase.name);

  constructor(
    private readonly repo: DeveloperApiRepository,
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly usageTracking: UsageTrackingService,
    private readonly eventEmitter: EventEmitter2,
    private readonly messageRepo: MessageRepository,
    private readonly orgLocale: OrgLocaleService,
  ) {}

  async execute(orgId: string, dto: DevSendBulkMessageDto) {
    const recipientCount = dto.to.length;

    // 1. Check usage limits for bulk count
    const usageCheck = await this.usageTracking.checkUsage(orgId, UsageMetricType.MESSAGES_SENT);
    const overLimit =
      usageCheck.limitValue > 0 && usageCheck.currentValue + recipientCount > usageCheck.limitValue;
    if (!usageCheck.allowed || overLimit) {
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
    for (const rawTo of dto.to) {
      // Numbers without a country code get the org's
      const to = (await this.orgLocale.normalizePhone(orgId, rawTo)) ?? rawTo;

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

      // Through the repository so body/media are encrypted at rest. Bulk priority
      // puts it in the send worker's bulk lane: warm-up daily caps, sending hours,
      // auto-pause, 10–40s human pacing and "typing…" — same as campaigns.
      const message = await this.messageRepo.create({
        orgId,
        conversationId: conversation.id,
        sessionId: session.id,
        direction: MessageDirection.OUTBOUND,
        type: messageType,
        body: dto.body,
        mediaUrl: dto.mediaUrl,
        contactPhone: to,
        priority: CAMPAIGN_CONFIG.CAMPAIGN_MESSAGE_PRIORITY,
        metadata: { source: 'developer-api-bulk' },
      });

      await this.prisma.messageEvent.create({
        data: { messageId: message.id, orgId, status: MessageStatus.QUEUED },
      });

      await this.queueService.publishOnce(
        QUEUE_NAMES.SEND_WHATSAPP_MESSAGE,
        { messageId: message.id, sessionId: session.id, orgId },
        `msg-${message.id}`,
        { priority: CAMPAIGN_CONFIG.CAMPAIGN_MESSAGE_PRIORITY },
      );

      results.push({ to, messageId: message.id, status: 'QUEUED' });
    }

    // 4. Each message is counted toward the plan by the send worker once it goes out

    this.eventEmitter.emit(EVENT_NAMES.MESSAGE_QUEUED, {
      orgId,
      source: 'developer-api-bulk',
      count: recipientCount,
    });

    this.logger.log(`Developer API: Bulk ${recipientCount} messages queued in org ${orgId}`);

    return { queued: recipientCount, messages: results };
  }
}
