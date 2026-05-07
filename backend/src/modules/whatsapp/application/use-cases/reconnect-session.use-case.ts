import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WhatsAppSessionRepository } from '../../infrastructure/repositories/whatsapp-session.repository';
import { BaileysConnectionManager } from '@/infrastructure/external/whatsapp/baileys-connection-manager.service';
import { WhatsAppSessionService } from '../../domain/services/session.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EVENT_NAMES } from '@/common/constants';
import { AuditAction } from '@prisma/client';

@Injectable()
export class ReconnectSessionUseCase {
  private readonly logger = new Logger(ReconnectSessionUseCase.name);

  constructor(
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly connectionManager: BaileysConnectionManager,
    private readonly sessionService: WhatsAppSessionService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    userRole: string,
    sessionId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const session = await this.sessionRepo.findByIdAndOrg(sessionId, orgId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (!this.sessionService.validateSessionOwnership(session.userId, userId, userRole)) {
      throw new ForbiddenException('You can only reconnect your own session');
    }

    if (session.status !== 'DISCONNECTED') {
      throw new ConflictException(
        `Session is already ${session.status} — only DISCONNECTED sessions can be reconnected`,
      );
    }

    if (!session.encryptedCreds) {
      throw new ConflictException(
        'Session credentials have been cleared (device was logged out from WhatsApp). Please create a new session.',
      );
    }

    // Reset retry counter and flip to RECONNECTING so health worker + event handler allow jobs through
    await this.sessionRepo.resetReconnectCount(session.id);

    // Notify frontend immediately so it can show "Reconnecting…" state
    this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_SESSION_RECONNECTING, {
      sessionId: session.id,
      orgId: session.orgId,
      userId: session.userId,
      attempt: 1,
    });

    // Fire Baileys connection non-blocking — WebSocket will push connected/disconnected result
    this.connectionManager
      .createConnection(session.id, session.userId, session.orgId)
      .catch((err) => {
        this.logger.error(
          `Manual reconnect failed for session ${session.id}: ${err.message}`,
        );
        this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_SESSION_DISCONNECTED, {
          sessionId: session.id,
          orgId: session.orgId,
          userId: session.userId,
          reason: `Manual reconnect failed: ${err.message}`,
        });
      });

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.WHATSAPP_SESSION_CONNECTED,
      targetType: 'WhatsAppSession',
      targetId: session.id,
      metadata: { action: 'manual_reconnect_initiated' },
      ipAddress,
      userAgent,
    });

    return {
      sessionId: session.id,
      message: 'Reconnect initiated. Status will be pushed via WebSocket.',
    };
  }
}
