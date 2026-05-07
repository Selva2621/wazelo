import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { MessageRepository } from '@/modules/messages/infrastructure/repositories/message.repository';
import { ConversationRepository } from '@/modules/messages/infrastructure/repositories/conversation.repository';
import { MessageEventRepository } from '@/modules/messages/infrastructure/repositories/message-event.repository';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QUEUE_NAMES, EVENT_NAMES } from '@/common/constants';
import {
  AuditAction,
  MessageDirection,
  MessageStatus,
  MessageType,
} from '@prisma/client';

export interface IncomingMessageJobData {
  sessionId: string;
  whatsappMessageId: string;
  contactPhone: string;
  contactName?: string;
  type: string;
  body?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaSize?: number;
  timestamp: number;
}

/**
 * Worker that processes incoming WhatsApp messages via queue.
 *
 * Pipeline:
 * 1. Deduplicate by whatsappMessageId
 * 2. Persist message to DB
 * 3. Find or create conversation
 * 4. Update conversation metadata
 * 5. Emit events for WebSocket push and contact auto-creation
 * 6. Record audit event
 *
 * All processing happens AFTER persistence (persist-before-notify pattern)
 * to ensure no message is ever lost (AC1).
 */
@Injectable()
export class IncomingMessageWorker implements OnModuleInit {
  private readonly logger = new Logger(IncomingMessageWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly messageRepo: MessageRepository,
    private readonly conversationRepo: ConversationRepository,
    private readonly messageEventRepo: MessageEventRepository,
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribe<IncomingMessageJobData>(
      QUEUE_NAMES.PROCESS_INCOMING_MESSAGE,
      async (job) => this.handle(job.data, job.id),
    );
    this.logger.log('IncomingMessageWorker subscribed');
  }

  private async handle(data: IncomingMessageJobData, jobId: string): Promise<void> {
    const { sessionId, whatsappMessageId, contactPhone } = data;

    // 1. Deduplication by whatsappMessageId (AC2 — idempotency)
    const existing = await this.messageRepo.findByWhatsAppMessageId(whatsappMessageId);
    if (existing) {
      this.logger.log(`Duplicate incoming message ignored: ${whatsappMessageId}`);

      await this.auditService.log({
        orgId: existing.orgId,
        action: AuditAction.INCOMING_MESSAGE_DUPLICATE_IGNORED,
        targetType: 'Message',
        targetId: existing.id,
        metadata: { whatsappMessageId, jobId },
      });
      return;
    }

    // 2. Verify session exists
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      this.logger.warn(`Incoming message for unknown session: ${sessionId}`);
      return;
    }

    const orgId = session.orgId;

    // 3. Find or create conversation (race-safe upsert)
    const conversation = await this.conversationRepo.findOrCreate({
      orgId,
      sessionId,
      contactPhone,
    });

    // 4. Persist message FIRST (persist-before-notify)
    const message = await this.messageRepo.create({
      orgId,
      sessionId,
      conversationId: conversation.id,
      direction: MessageDirection.INBOUND,
      type: data.type as MessageType,
      contactPhone,
      contactName: data.contactName,
      body: data.body,
      mediaUrl: data.mediaUrl,
      mediaMimeType: data.mediaMimeType,
      mediaSize: data.mediaSize,
    });

    // 5. Set the WhatsApp message ID for future deduplication
    await this.messageRepo.setWhatsAppMessageId(message.id, whatsappMessageId);

    // 6. Record event log
    await this.messageEventRepo.record({
      messageId: message.id,
      orgId,
      status: MessageStatus.DELIVERED,
      metadata: {
        whatsappMessageId,
        jobId,
        originalTimestamp: data.timestamp,
        processingLatencyMs: Date.now() - data.timestamp * 1000,
      },
    });

    // 7. Update conversation with latest message
    await this.conversationRepo.updateLastMessage(
      conversation.id,
      data.body || null,
      true, // isInbound → increments unreadCount
    );

    // 8. Emit events for real-time WebSocket push + contact auto-creation
    this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_MESSAGE_RECEIVED, {
      messageId: message.id,
      sessionId,
      orgId,
      userId: session.userId,
      contactPhone,
      type: data.type,
      conversationId: conversation.id,
    });

    // 9. Enqueue SLA evaluation for inbound message
    await this.queueService.publishOnce(
      QUEUE_NAMES.SLA_EVALUATE,
      {
        type: 'inbound_message',
        orgId,
        conversationId: conversation.id,
        sessionId,
        assignedUserId: conversation.assignedToId ?? null,
        messageCreatedAt: new Date().toISOString(),
      },
      `sla:inbound:${message.id}`,
    );

    // 10. Emit conversation update
    this.eventEmitter.emit(EVENT_NAMES.CONVERSATION_UPDATED, {
      conversationId: conversation.id,
      orgId,
      lastMessageAt: new Date(),
      lastMessageBody: data.body,
      unreadCount: (conversation.unreadCount || 0) + 1,
    });

    // 11. Audit log
    await this.auditService.log({
      orgId,
      action: AuditAction.INCOMING_MESSAGE_RECEIVED,
      targetType: 'Message',
      targetId: message.id,
      metadata: {
        whatsappMessageId,
        contactPhone,
        type: data.type,
        sessionId,
        conversationId: conversation.id,
      },
    });

    // 12. Update session heartbeat
    await this.sessionRepo.updateHeartbeat(sessionId);

    this.logger.log(
      `Incoming message ${message.id} processed (wa=${whatsappMessageId}, conv=${conversation.id})`,
    );
  }
}
