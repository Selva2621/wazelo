import {
  Injectable,
  ConflictException,
  GatewayTimeoutException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WhatsAppSessionRepository } from '../../infrastructure/repositories/whatsapp-session.repository';
import { BaileysConnectionManager } from '@/infrastructure/external/whatsapp/baileys-connection-manager.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EVENT_NAMES } from '@/common/constants';
import { AuditAction } from '@prisma/client';
import { RequestPairingCodeDto } from '../dto';

/**
 * Link a WhatsApp number with an 8-character pairing code instead of a QR scan —
 * works from the phone itself (WhatsApp → Linked devices → Link with phone number).
 */
@Injectable()
export class RequestPairingCodeUseCase {
  private readonly logger = new Logger(RequestPairingCodeUseCase.name);

  constructor(
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly connectionManager: BaileysConnectionManager,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    dto: RequestPairingCodeDto,
    ipAddress: string,
    userAgent: string,
  ) {
    const phoneNumber = dto.phoneNumber.replace(/^\+/, '');

    // Reuse a session still waiting to be linked (QR or an earlier code); only one per user
    let session = await this.sessionRepo.findActiveByUserId(userId, orgId);
    let created = false;
    if (session) {
      if (session.status === 'DISCONNECTED' && session.encryptedCreds) {
        throw new ConflictException(
          JSON.stringify({
            code: 'SESSION_RECONNECTABLE',
            sessionId: session.id,
            message: 'A disconnected session with valid credentials exists. Use reconnect instead.',
          }),
        );
      }
      if (session.status !== 'CONNECTING') {
        throw new ConflictException('User already has an active WhatsApp session. Disconnect first.');
      }
    } else {
      session = await this.sessionRepo.create({ orgId, userId, idempotencyKey: dto.idempotencyKey });
      created = true;
    }

    let pairingCode: string;
    try {
      pairingCode = await this.connectionManager.requestPairingCode(session.id, userId, orgId, phoneNumber);
    } catch (error) {
      if (created) await this.sessionRepo.softDelete(session.id);
      this.logger.error(`Pairing code request failed for session ${session.id}`, error);
      throw new GatewayTimeoutException('WhatsApp did not return a pairing code. Please try again.');
    }

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.WHATSAPP_QR_GENERATED,
      targetType: 'WhatsAppSession',
      targetId: session.id,
      metadata: { method: 'PAIRING_CODE' },
      ipAddress,
      userAgent,
    });

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
      pairingCode,
      phoneNumber: `+${phoneNumber}`,
      message: 'Enter this code in WhatsApp → Linked devices → Link with phone number instead',
    };
  }
}
