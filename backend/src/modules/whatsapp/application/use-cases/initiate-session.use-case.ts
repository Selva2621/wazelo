import {
  Injectable,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WhatsAppSessionRepository } from '../../infrastructure/repositories/whatsapp-session.repository';
import { BaileysConnectionManager } from '@/infrastructure/external/whatsapp/baileys-connection-manager.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { WhatsAppSessionService } from '../../domain/services/session.service';
import { EVENT_NAMES } from '@/common/constants';
import { AuditAction } from '@prisma/client';
import { InitiateSessionDto } from '../dto';

@Injectable()
export class InitiateSessionUseCase {
  private readonly logger = new Logger(InitiateSessionUseCase.name);

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
    dto: InitiateSessionDto,
    ipAddress: string,
    userAgent: string,
  ) {
    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.sessionRepo.findByIdempotencyKey(dto.idempotencyKey);
      if (existing) {
        this.logger.log(`Idempotent hit for key: ${dto.idempotencyKey}`);
        return { session: existing, message: 'Session already exists' };
      }
    }

    // Check for existing session — only one per user
    const activeSession = await this.sessionRepo.findActiveByUserId(userId, orgId);
    if (activeSession) {
      if (activeSession.status === 'CONNECTING') {
        // Destroy stale Baileys connection and invalidate session
        await this.connectionManager.destroyConnection(activeSession.id);
        await this.sessionRepo.disconnectSession(activeSession.id);
        this.logger.log(`Invalidated stale CONNECTING session ${activeSession.id}`);
      } else if (activeSession.status === 'DISCONNECTED' && activeSession.encryptedCreds) {
        // Session exists with creds — reconnect instead of creating a duplicate
        throw new ConflictException(
          JSON.stringify({
            code: 'SESSION_RECONNECTABLE',
            sessionId: activeSession.id,
            message: 'A disconnected session with valid credentials exists. Use reconnect instead.',
          }),
        );
      } else {
        throw new ConflictException(
          'User already has an active WhatsApp session. Disconnect first.',
        );
      }
    }

    // Create new session record
    const session = await this.sessionRepo.create({
      orgId,
      userId,
      idempotencyKey: dto.idempotencyKey,
    });

    // Start Baileys connection — QR will be pushed async via WebSocket
    try {
      await this.connectionManager.createConnection(session.id, userId, orgId);
    } catch (error) {
      await this.sessionRepo.softDelete(session.id);
      this.logger.error(`Connection creation failed, rolled back session ${session.id}`, error);
      throw error;
    }

    // Audit log
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.WHATSAPP_QR_GENERATED,
      targetType: 'WhatsAppSession',
      targetId: session.id,
      ipAddress,
      userAgent,
    });

    // Emit event
    this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_QR_GENERATED, {
      sessionId: session.id,
      orgId,
      userId,
    });

    return {
      session: {
        id: session.id,
        status: session.status,
        createdAt: session.createdAt,
      },
      message: 'QR code will be pushed via WebSocket',
    };
  }
}
