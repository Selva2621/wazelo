import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WhatsAppSessionRepository } from '../../infrastructure/repositories/whatsapp-session.repository';
import { WhatsAppSessionService } from '../../domain/services/session.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { EVENT_NAMES, QUEUE_NAMES } from '@/common/constants';
import { AuditAction, WhatsAppSessionStatus } from '@prisma/client';

export interface SessionEventPayload {
  sessionId: string;
  orgId: string;
  userId: string;
  /**
   * disconnected = network drop (reconnect with backoff)
   * logout / banned = the number is gone (hold queued work, user must link again)
   * stopped = replaced elsewhere or bad session (no auto-reconnect)
   */
  event: 'connected' | 'disconnected' | 'logout' | 'banned' | 'stopped' | 'heartbeat' | 'phone_activity';
  phoneNumber?: string;
  /** 'connected' right after a QR scan / pairing code (the phone was online for it) */
  newLogin?: boolean;
  reason?: string;
  /** Baileys DisconnectReason status code */
  statusCode?: number;
  /** Classified reason: NETWORK | LOGGED_OUT | BANNED | REPLACED | BAD_SESSION */
  disconnectReason?: string;
}

@Injectable()
export class HandleSessionEventUseCase {
  private readonly logger = new Logger(HandleSessionEventUseCase.name);

  constructor(
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly sessionService: WhatsAppSessionService,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(payload: SessionEventPayload): Promise<void> {
    const session = await this.sessionRepo.findById(payload.sessionId);
    if (!session) {
      this.logger.warn(`Event for unknown session: ${payload.sessionId}`);
      return;
    }

    const previousStatus = session.status;

    switch (payload.event) {
      case 'connected':
        await this.handleConnected(session, payload);
        break;
      case 'disconnected':
        await this.handleDisconnected(session, payload, previousStatus);
        break;
      case 'logout':
      case 'banned':
        await this.handleNumberLost(session, payload);
        break;
      case 'stopped':
        await this.handleStopped(session, payload);
        break;
      case 'heartbeat':
        await this.handleHeartbeat(session);
        break;
      case 'phone_activity':
        await this.sessionRepo.updatePhoneActivity(session.id);
        break;
      default:
        this.logger.warn(`Unknown session event: ${payload.event}`);
    }
  }

  private async handleConnected(
    session: Record<string, any>,
    payload: SessionEventPayload,
  ) {
    await this.sessionRepo.updateStatus(session.id, {
      status: WhatsAppSessionStatus.CONNECTED,
      phoneNumber: payload.phoneNumber,
      lastActiveAt: new Date(),
      lastHeartbeatAt: new Date(),
      reconnectCount: 0,
      disconnectCode: null,
      disconnectReason: null,
      // First successful link starts the send warm-up clock
      ...(!session.linkedAt && { linkedAt: new Date() }),
      // Linking needs the phone online; a plain reconnect doesn't prove that
      ...((payload.newLogin || !session.lastPhoneActivityAt) && { lastPhoneActivityAt: new Date() }),
    });

    await this.auditService.log({
      orgId: session.orgId,
      userId: session.userId,
      action: AuditAction.WHATSAPP_SESSION_CONNECTED,
      targetType: 'WhatsAppSession',
      targetId: session.id,
      metadata: { phoneNumber: payload.phoneNumber },
    });

    this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_SESSION_CONNECTED, {
      sessionId: session.id,
      orgId: session.orgId,
      userId: session.userId,
      phoneNumber: payload.phoneNumber,
    });
  }

  private async handleDisconnected(
    session: Record<string, any>,
    payload: SessionEventPayload,
    previousStatus: string,
  ) {
    if (payload.disconnectReason) {
      await this.sessionRepo.updateStatus(session.id, {
        status: session.status,
        disconnectCode: payload.statusCode ?? null,
        disconnectReason: payload.disconnectReason,
      });
    }

    // Attempt auto-reconnect if possible
    if (this.sessionService.canRetryReconnect(session.reconnectCount)) {
      await this.sessionRepo.incrementReconnectCount(session.id);
      const delayMs = this.sessionService.getReconnectDelayMs(session.reconnectCount);

      this.logger.log(
        `Scheduling reconnect for session ${session.id}, attempt ${session.reconnectCount + 1}`,
      );

      await this.queueService.publish(
        QUEUE_NAMES.WHATSAPP_SESSION_HEALTH_CHECK,
        {
          sessionId: session.id,
          action: 'reconnect',
          attempt: session.reconnectCount + 1,
        },
        { startAfter: Math.round(delayMs / 1000) },
      );

      this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_SESSION_RECONNECTING, {
        sessionId: session.id,
        orgId: session.orgId,
        userId: session.userId,
        attempt: session.reconnectCount + 1,
      });

      return;
    }

    // Max retries exceeded — preserve creds so user can reconnect without re-scanning QR
    await this.sessionRepo.markAsDisconnected(session.id);

    await this.auditService.log({
      orgId: session.orgId,
      userId: session.userId,
      action: AuditAction.WHATSAPP_SESSION_DISCONNECTED,
      targetType: 'WhatsAppSession',
      targetId: session.id,
      metadata: {
        reason: payload.reason || 'Disconnected after max retries',
        previousStatus,
        reconnectAttempts: session.reconnectCount,
      },
    });

    this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_SESSION_DISCONNECTED, {
      sessionId: session.id,
      orgId: session.orgId,
      userId: session.userId,
      reason: payload.reason || 'Max reconnect attempts exceeded',
    });
  }

  /**
   * Logged out (401) or banned (403): the number is gone. Wipe creds, never
   * reconnect, and tell the rest of the platform to hold work queued on it.
   */
  private async handleNumberLost(
    session: Record<string, any>,
    payload: SessionEventPayload,
  ) {
    const disconnectReason =
      payload.disconnectReason ?? (payload.event === 'banned' ? 'BANNED' : 'LOGGED_OUT');
    const reason = payload.reason || 'Logged out from mobile device';

    await this.sessionRepo.disconnectSession(session.id);
    await this.sessionRepo.updateStatus(session.id, {
      status: WhatsAppSessionStatus.DISCONNECTED,
      disconnectCode: payload.statusCode ?? null,
      disconnectReason,
    });

    await this.auditService.log({
      orgId: session.orgId,
      userId: session.userId,
      action: AuditAction.WHATSAPP_SESSION_DISCONNECTED,
      targetType: 'WhatsAppSession',
      targetId: session.id,
      metadata: { reason, disconnectReason, statusCode: payload.statusCode },
    });

    this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_NUMBER_LOST, {
      sessionId: session.id,
      orgId: session.orgId,
      userId: session.userId,
      disconnectReason,
      reason,
    });

    this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_SESSION_DISCONNECTED, {
      sessionId: session.id,
      orgId: session.orgId,
      userId: session.userId,
      reason,
      disconnectReason,
    });
  }

  /** Replaced by another session (440) or invalid session (411/500): stop, the user reconnects. */
  private async handleStopped(
    session: Record<string, any>,
    payload: SessionEventPayload,
  ) {
    await this.sessionRepo.markAsDisconnected(session.id);
    await this.sessionRepo.updateStatus(session.id, {
      status: WhatsAppSessionStatus.DISCONNECTED,
      disconnectCode: payload.statusCode ?? null,
      disconnectReason: payload.disconnectReason ?? null,
    });

    await this.auditService.log({
      orgId: session.orgId,
      userId: session.userId,
      action: AuditAction.WHATSAPP_SESSION_DISCONNECTED,
      targetType: 'WhatsAppSession',
      targetId: session.id,
      metadata: {
        reason: payload.reason,
        disconnectReason: payload.disconnectReason,
        statusCode: payload.statusCode,
      },
    });

    this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_SESSION_DISCONNECTED, {
      sessionId: session.id,
      orgId: session.orgId,
      userId: session.userId,
      reason: payload.reason || 'WhatsApp session stopped',
      disconnectReason: payload.disconnectReason,
    });
  }

  private async handleHeartbeat(session: Record<string, any>) {
    await this.sessionRepo.updateHeartbeat(session.id);
  }
}
