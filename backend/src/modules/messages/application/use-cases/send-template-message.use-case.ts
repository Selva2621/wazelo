import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MessageDirection, MessageStatus } from '@prisma/client';
import { TemplateRepository } from '../../infrastructure/repositories/template.repository';
import { ChannelService } from '@/modules/channels/domain/services/channel.service';
import { MessageEncryptionService } from '../../domain/services/message-encryption.service';
import { QUEUE_NAMES, EVENT_NAMES } from '@/common/constants';

export interface SendTemplateParams {
  orgId: string;
  userId: string;
  channelId: string;
  templateId: string;
  contactPhone: string;
  variables?: Record<string, string>;
  conversationId?: string;
  idempotencyKey?: string;
}

@Injectable()
export class SendTemplateMessageUseCase {
  private readonly logger = new Logger(SendTemplateMessageUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly templateRepo: TemplateRepository,
    private readonly channelService: ChannelService,
    private readonly eventEmitter: EventEmitter2,
    private readonly enc: MessageEncryptionService,
  ) {}

  async execute(params: SendTemplateParams) {
    const { orgId, userId, channelId, templateId, contactPhone, variables, conversationId, idempotencyKey } = params;

    // 1. Idempotency check
    if (idempotencyKey) {
      const existing = await this.prisma.message.findUnique({ where: { idempotencyKey } });
      if (existing) return existing;
    }

    // 2. Load template
    const template = await this.templateRepo.findById(templateId, orgId);
    if (!template) throw new NotFoundException('Template not found');
    if (template.status !== 'APPROVED') {
      throw new BadRequestException(`Template "${template.name}" is not approved (status: ${template.status})`);
    }

    // 3. Verify channel
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, orgId, type: 'WHATSAPP', deletedAt: null, status: 'ACTIVE' },
    });
    if (!channel) throw new BadRequestException('Active WhatsApp channel not found');

    // 4. Rate limit
    await this.channelService.checkRateLimit(channelId, orgId, channel.rateLimitPerMin);

    // 5. Build template body for display (substitute variables)
    const components = template.components as any[];
    let displayBody = '';
    for (const comp of components) {
      if (comp.type === 'BODY') {
        displayBody = comp.text || '';
        if (variables) {
          Object.entries(variables).forEach(([key, value], index) => {
            displayBody = displayBody.replace(`{{${index + 1}}}`, value);
          });
        }
      }
    }

    // 6. Find or create conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: { orgId, channelId, contactPhone, status: 'OPEN', deletedAt: null },
    });
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          orgId,
          channelId,
          channelType: 'WHATSAPP',
          contactIdentifier: contactPhone,
          contactPhone,
          status: 'OPEN',
          lastMessageAt: new Date(),
        },
      });
    }

    // 7. Create message
    const message = await this.prisma.message.create({
      data: {
        orgId,
        channelId,
        channelType: 'WHATSAPP',
        conversationId: conversation.id,
        direction: MessageDirection.OUTBOUND,
        type: 'TEXT',
        status: MessageStatus.QUEUED,
        contactPhone,
        body: displayBody || `[Template: ${template.name}]`,
        idempotencyKey,
        channelPayload: {
          templateName: template.name,
          templateLanguage: template.language,
          templateId: template.whatsappTemplateId,
          variables,
          components: template.components,
        },
        maxRetries: 3,
      },
    });

    // 8. Queue for send
    await this.queueService.publish(
      QUEUE_NAMES.SEND_CHANNEL_MESSAGE,
      { messageId: message.id, channelId, channelType: 'WHATSAPP', orgId },
      { singletonKey: `msg-${message.id}` },
    );

    // 9. Update conversation
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        lastMessageBody: this.enc.encryptIfPresent(
          displayBody?.substring(0, 500) || `[Template: ${template.name}]`,
        ),
      },
    });

    // 10. Emit
    this.eventEmitter.emit(EVENT_NAMES.MESSAGE_QUEUED, {
      orgId,
      messageId: message.id,
      channelId,
      channelType: 'WHATSAPP',
      conversationId: conversation.id,
      contactPhone,
      type: 'TEXT',
    });

    return message;
  }
}
