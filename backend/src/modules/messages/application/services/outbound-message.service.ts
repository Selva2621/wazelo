import { Injectable, Logger } from '@nestjs/common';
import { MessageDirection, MessageStatus, MessageType } from '@prisma/client';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { MessageRepository } from '../../infrastructure/repositories/message.repository';
import { ConversationRepository } from '../../infrastructure/repositories/conversation.repository';
import { MessageEventRepository } from '../../infrastructure/repositories/message-event.repository';
import { QUEUE_NAMES, MESSAGING_CONFIG } from '@/common/constants';

export interface OutboundMessageInput {
  orgId: string;
  sessionId: string;
  conversationId?: string;
  contactPhone: string;
  contactId?: string;
  contactName?: string;
  body: string;
  type?: MessageType;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Single canonical path for all outbound WhatsApp messages.
 *
 * All bot-originated messages (chatbot flows, automation actions, follow-ups)
 * go through here so they share:
 *  - DB record creation before queueing
 *  - Idempotency deduplication
 *  - Message event recording
 *  - Proper retry configuration via publishOnce
 */
@Injectable()
export class OutboundMessageService {
  private readonly logger = new Logger(OutboundMessageService.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly messageRepo: MessageRepository,
    private readonly conversationRepo: ConversationRepository,
    private readonly messageEventRepo: MessageEventRepository,
  ) {}

  async send(input: OutboundMessageInput): Promise<{ messageId: string }> {
    const {
      orgId,
      sessionId,
      contactPhone,
      contactId,
      contactName,
      body,
      type = MessageType.TEXT,
      idempotencyKey,
      metadata,
    } = input;

    // Idempotency: skip if already created
    if (idempotencyKey) {
      const existing = await this.messageRepo.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        this.logger.debug(`Deduplicated outbound message: key=${idempotencyKey}`);
        return { messageId: existing.id };
      }
    }

    // Resolve conversationId — find or create based on contactPhone
    let conversationId = input.conversationId;
    if (!conversationId) {
      const conversation = await this.conversationRepo.findOrCreate({
        orgId,
        sessionId,
        contactPhone,
        contactId,
      });
      conversationId = conversation.id;
    }

    // Create DB record first (QUEUED status)
    const message = await this.messageRepo.create({
      orgId,
      sessionId,
      conversationId,
      direction: MessageDirection.OUTBOUND,
      type,
      contactPhone,
      contactName,
      body,
      idempotencyKey,
      maxRetries: MESSAGING_CONFIG.MAX_RETRY_COUNT,
      metadata,
    });

    // Record QUEUED event for traceability
    await this.messageEventRepo.record({
      messageId: message.id,
      orgId,
      status: MessageStatus.QUEUED,
      metadata,
    });

    // Queue with idempotency + retry config
    const jobKey = idempotencyKey ? `msg-${message.id}` : undefined;
    await this.queueService.publishOnce(
      QUEUE_NAMES.SEND_WHATSAPP_MESSAGE,
      { messageId: message.id, sessionId, orgId },
      jobKey ?? `msg-${message.id}`,
      {
        retryLimit: MESSAGING_CONFIG.MAX_RETRY_COUNT,
        retryDelay: MESSAGING_CONFIG.RETRY_BASE_DELAY_SECONDS,
        retryBackoff: true,
      },
    );

    return { messageId: message.id };
  }
}
