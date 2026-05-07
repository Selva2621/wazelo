import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { WhatsAppSessionRepository } from '../../infrastructure/repositories/whatsapp-session.repository';
import { BaileysConnectionManager } from '@/infrastructure/external/whatsapp/baileys-connection-manager.service';
import { WhatsAppSessionService } from '../../domain/services/session.service';

@Injectable()
export class RefreshQrUseCase {
  private readonly logger = new Logger(RefreshQrUseCase.name);

  constructor(
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly connectionManager: BaileysConnectionManager,
    private readonly sessionService: WhatsAppSessionService,
  ) {}

  async execute(orgId: string, userId: string, sessionId: string) {
    const session = await this.sessionRepo.findByIdAndOrg(sessionId, orgId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Cannot refresh QR for another user\'s session');
    }

    if (session.status !== 'CONNECTING') {
      throw new BadRequestException(
        'QR refresh is only available for sessions in CONNECTING state',
      );
    }

    // Destroy existing connection and recreate — Baileys will auto-emit new QR via connection.update
    await this.connectionManager.destroyConnection(session.id);
    await this.connectionManager.createConnection(session.id, userId, orgId);

    return {
      sessionId: session.id,
      message: 'QR refresh initiated, new QR code will be pushed via WebSocket',
    };
  }
}
