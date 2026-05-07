import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeveloperApiRepository } from '../../infrastructure/repositories/developer-api.repository';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { UsageTrackingService } from '@/modules/billing/domain/services/usage-tracking.service';
import { QUEUE_NAMES, EVENT_NAMES } from '@/common/constants';
import { MessageDirection, MessageStatus, MessageType, UsageMetricType } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { DevSendTemplateDto } from '../dto';

@Injectable()
export class DevSendTemplateMessageUseCase {
  private readonly logger = new Logger(DevSendTemplateMessageUseCase.name);

  constructor(
    private readonly repo: DeveloperApiRepository,
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly usageTracking: UsageTrackingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(orgId: string, dto: DevSendTemplateDto) {
    // 1. Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.prisma.message.findFirst({
        where: { idempotencyKey: dto.idempotencyKey, orgId },
        select: { id: true, status: true, createdAt: true },
      });
      if (existing) return { message: existing, deduplicated: true };
    }

    // 2. Check usage limits
    const usageCheck = await this.usageTracking.checkUsage(orgId, UsageMetricType.MESSAGES_SENT);
    if (!usageCheck.allowed) {
      throw new BadRequestException({
        error: 'USAGE_LIMIT_EXCEEDED',
        message: 'Message limit reached for your current plan. Please upgrade.',
        details: { used: usageCheck.currentValue, limit: usageCheck.limitValue },
      });
    }

    // 3. Find template in DB and render body
    const template = await this.prisma.messageTemplate.findFirst({
      where: { orgId, name: dto.templateName, status: 'APPROVED', deletedAt: null },
    });
    if (!template) {
      throw new BadRequestException(`Template '${dto.templateName}' not found or not approved.`);
    }

    const bodyComponent = (template.components as any[]).find((c) => c.type === 'BODY');
    const rawBody: string = bodyComponent?.text ?? dto.templateName;

    // Replace {{variableName}} placeholders with provided values
    const renderedBody = rawBody.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => {
      return dto.variables?.[key] ?? `{{${key}}}`;
    });

    // 4. Find session
    const session = await this.repo.getFirstConnectedSession(orgId);
    if (!session) {
      throw new BadRequestException('No connected WhatsApp session. Please connect WhatsApp first.');
    }

    // 5. Auto-create or find contact
    const contactResult = await this.repo.createContact({ orgId, name: dto.to, phoneNumber: dto.to });

    // 6. Find or create conversation
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

    // 7. Create message record with rendered body
    const message = await this.prisma.message.create({
      data: {
        orgId,
        conversationId: conversation.id,
        sessionId: session.id,
        direction: MessageDirection.OUTBOUND,
        type: MessageType.TEXT,
        body: renderedBody,
        contactPhone: dto.to,
        status: MessageStatus.QUEUED,
        idempotencyKey: dto.idempotencyKey,
        metadata: { templateName: dto.templateName, variables: dto.variables ?? {} } as any,
      },
    });

    await this.prisma.messageEvent.create({
      data: { messageId: message.id, orgId, status: MessageStatus.QUEUED },
    });

    // 8. Queue as plain TEXT — Baileys handles it normally
    await this.queueService.publish(QUEUE_NAMES.SEND_WHATSAPP_MESSAGE, {
      messageId: message.id,
      sessionId: session.id,
      orgId,
      contactPhone: dto.to,
      type: MessageType.TEXT,
      body: renderedBody,
    });

    await this.usageTracking.incrementUsage(orgId, UsageMetricType.MESSAGES_SENT);

    this.eventEmitter.emit(EVENT_NAMES.MESSAGE_QUEUED, {
      messageId: message.id,
      orgId,
      contactPhone: dto.to,
      source: 'developer-api-template',
    });

    this.logger.log(`Developer API: Template '${dto.templateName}' rendered and queued for ${dto.to} in org ${orgId}`);

    return {
      message: {
        id: message.id,
        to: dto.to,
        templateName: dto.templateName,
        renderedBody,
        status: 'QUEUED',
        createdAt: message.createdAt,
      },
      deduplicated: false,
    };
  }
}
