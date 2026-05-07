import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WhatsAppSessionRepository } from '../../infrastructure/repositories/whatsapp-session.repository';
import { BaileysConnectionManager } from '@/infrastructure/external/whatsapp/baileys-connection-manager.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { WhatsAppSessionService } from '../../domain/services/session.service';
import { EVENT_NAMES } from '@/common/constants';
import { AuditAction } from '@prisma/client';
import { DisconnectSessionDto } from '../dto';

@Injectable()
export class DisconnectSessionUseCase {
  private readonly logger = new Logger(DisconnectSessionUseCase.name);

  constructor(
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly connectionManager: BaileysConnectionManager,
    private readonly auditService: AuditService,
    private readonly sessionService: WhatsAppSessionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    userRole: string,
    dto: DisconnectSessionDto,
    ipAddress: string,
    userAgent: string,
  ) {
    const targetUserId = dto.targetUserId || userId;

    // Find active session for target user
    const session = await this.sessionRepo.findActiveByUserId(targetUserId, orgId);
    if (!session) {
      throw new NotFoundException('No active WhatsApp session found for this user');
    }

    // Authorization: only own session or admin
    if (!this.sessionService.validateSessionOwnership(session.userId, userId, userRole)) {
      throw new ForbiddenException('You can only disconnect your own session');
    }

    const isForceDisconnect = targetUserId !== userId;

    // Destroy Baileys socket connection (logout = true to clear auth state)
    await this.connectionManager.destroyConnection(session.id, true);

    // Mark session as disconnected in DB
    await this.sessionRepo.disconnectSession(session.id);

    // Audit
    const auditAction = isForceDisconnect
      ? AuditAction.WHATSAPP_SESSION_FORCE_DISCONNECTED
      : AuditAction.WHATSAPP_SESSION_DISCONNECTED;

    await this.auditService.log({
      orgId,
      userId,
      action: auditAction,
      targetType: 'WhatsAppSession',
      targetId: session.id,
      metadata: {
        targetUserId,
        reason: dto.reason || 'Manual disconnect',
        isForceDisconnect,
      },
      ipAddress,
      userAgent,
    });

    // Emit event
    const eventName = isForceDisconnect
      ? EVENT_NAMES.WHATSAPP_SESSION_FORCE_DISCONNECTED
      : EVENT_NAMES.WHATSAPP_SESSION_DISCONNECTED;

    this.eventEmitter.emit(eventName, {
      sessionId: session.id,
      orgId,
      userId: targetUserId,
      ...(isForceDisconnect && { disconnectedById: userId }),
      reason: dto.reason || 'Manual disconnect',
    });

    return { message: 'Session disconnected successfully' };
  }
}
