import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppWebSocketGateway } from '@/infrastructure/websocket/websocket.gateway';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EVENT_NAMES } from '@/common/constants';
import {
  WhatsAppQrGeneratedEvent,
  WhatsAppSessionConnectedEvent,
  WhatsAppSessionDisconnectedEvent,
  WhatsAppSessionReconnectingEvent,
  WhatsAppSessionForceDisconnectedEvent,
  WhatsAppMessageReceivedEvent,
  WhatsAppMessageSentEvent,
  WhatsAppMessageDeliveredEvent,
  WhatsAppMessageReadEvent,
  WhatsAppMessageFailedEvent,
  WhatsAppStatusUpdateEvent,
  MessageQueuedEvent,
  MessageProcessingEvent,
  MessageDeadLetteredEvent,
  MessageReprocessedEvent,
  ConversationUpdatedEvent,
  RateLimitExceededEvent,
} from '../event-bus';

@Injectable()
export class WhatsAppEventsHandler {
  private readonly logger = new Logger(WhatsAppEventsHandler.name);

  constructor(
    private readonly wsGateway: AppWebSocketGateway,
    private readonly auditService: AuditService,
  ) {}

  // ───── Session Events ─────

  @OnEvent(EVENT_NAMES.WHATSAPP_SESSION_CONNECTED)
  handleSessionConnected(event: WhatsAppSessionConnectedEvent): void {
    this.wsGateway.emitToUser(event.userId, 'whatsapp:session:connected', {
      sessionId: event.sessionId,
      phoneNumber: event.phoneNumber,
    });
    this.wsGateway.emitToOrg(event.orgId, 'whatsapp:session:status', {
      sessionId: event.sessionId,
      userId: event.userId,
      status: 'CONNECTED',
      phoneNumber: event.phoneNumber,
    });
  }

  @OnEvent(EVENT_NAMES.WHATSAPP_SESSION_DISCONNECTED)
  handleSessionDisconnected(event: WhatsAppSessionDisconnectedEvent): void {
    this.wsGateway.emitToUser(event.userId, 'whatsapp:session:disconnected', {
      sessionId: event.sessionId,
      reason: event.reason,
    });
    this.wsGateway.emitToOrg(event.orgId, 'whatsapp:session:status', {
      sessionId: event.sessionId,
      userId: event.userId,
      status: 'DISCONNECTED',
      reason: event.reason,
    });
  }

  @OnEvent(EVENT_NAMES.WHATSAPP_SESSION_RECONNECTING)
  handleSessionReconnecting(event: WhatsAppSessionReconnectingEvent): void {
    this.wsGateway.emitToUser(event.userId, 'whatsapp:session:reconnecting', {
      sessionId: event.sessionId,
      attempt: event.attempt,
    });
    this.wsGateway.emitToOrg(event.orgId, 'whatsapp:session:status', {
      sessionId: event.sessionId,
      userId: event.userId,
      status: 'RECONNECTING',
      attempt: event.attempt,
    });
  }

  @OnEvent(EVENT_NAMES.WHATSAPP_SESSION_FORCE_DISCONNECTED)
  handleSessionForceDisconnected(event: WhatsAppSessionForceDisconnectedEvent): void {
    this.wsGateway.emitToUser(event.userId, 'whatsapp:session:disconnected', {
      sessionId: event.sessionId,
      reason: 'Force disconnected by admin',
      forceDisconnect: true,
    });
    this.wsGateway.emitToOrg(event.orgId, 'whatsapp:session:status', {
      sessionId: event.sessionId,
      userId: event.userId,
      status: 'DISCONNECTED',
      forceDisconnect: true,
    });
  }

  // ───── Message Events ─────

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_RECEIVED)
  handleMessageReceived(event: WhatsAppMessageReceivedEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'whatsapp:message:received', {
      messageId: event.messageId,
      sessionId: event.sessionId,
      contactPhone: event.contactPhone,
      type: event.type,
    });
  }

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_SENT)
  handleMessageSent(event: WhatsAppMessageSentEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'whatsapp:message:status', {
      messageId: event.messageId,
      status: 'SENT',
      whatsappMessageId: event.whatsappMessageId,
    });
  }

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_DELIVERED)
  handleMessageDelivered(event: WhatsAppMessageDeliveredEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'whatsapp:message:status', {
      messageId: event.messageId,
      status: 'DELIVERED',
    });
  }

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_READ)
  handleMessageRead(event: WhatsAppMessageReadEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'whatsapp:message:status', {
      messageId: event.messageId,
      status: 'READ',
    });
  }

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_FAILED)
  handleMessageFailed(event: WhatsAppMessageFailedEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'whatsapp:message:status', {
      messageId: event.messageId,
      status: 'FAILED',
      reason: event.reason,
      retryCount: event.retryCount,
    });
  }

  // ───── EPIC 5 — Messaging Engine Events ─────

  @OnEvent(EVENT_NAMES.MESSAGE_QUEUED)
  handleMessageQueued(event: MessageQueuedEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'whatsapp:message:queued', {
      messageId: event.messageId,
      conversationId: event.conversationId,
      sessionId: event.sessionId,
      contactPhone: event.contactPhone,
      type: event.type,
    });
  }

  @OnEvent(EVENT_NAMES.MESSAGE_PROCESSING)
  handleMessageProcessing(event: MessageProcessingEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'whatsapp:message:status', {
      messageId: event.messageId,
      status: 'PROCESSING',
    });
  }

  @OnEvent(EVENT_NAMES.MESSAGE_DEAD_LETTERED)
  handleMessageDeadLettered(event: MessageDeadLetteredEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'whatsapp:message:dead-lettered', {
      messageId: event.messageId,
      reason: event.reason,
      retryCount: event.retryCount,
    });
  }

  @OnEvent(EVENT_NAMES.CONVERSATION_UPDATED)
  handleConversationUpdated(event: ConversationUpdatedEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'conversation:updated', {
      conversationId: event.conversationId,
      lastMessageAt: event.lastMessageAt,
      lastMessageBody: event.lastMessageBody,
      unreadCount: event.unreadCount,
    });
  }

  @OnEvent(EVENT_NAMES.RATE_LIMIT_EXCEEDED)
  handleRateLimitExceeded(event: RateLimitExceededEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'whatsapp:rate-limit', {
      sessionId: event.sessionId,
      limitType: event.limitType,
      currentCount: event.currentCount,
      maxAllowed: event.maxAllowed,
    });
  }
}
