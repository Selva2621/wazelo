import { Injectable, NotFoundException } from '@nestjs/common';
import { WhatsAppSessionRepository } from '../../infrastructure/repositories/whatsapp-session.repository';

@Injectable()
export class GetSessionUseCase {
  constructor(private readonly sessionRepo: WhatsAppSessionRepository) {}

  async execute(sessionId: string, orgId: string) {
    const session = await this.sessionRepo.findByIdAndOrg(sessionId, orgId);
    if (!session) {
      throw new NotFoundException('WhatsApp session not found');
    }

    return this.toResponse(session);
  }

  async executeForUser(userId: string, orgId: string) {
    const session = await this.sessionRepo.findActiveByUserId(userId, orgId);
    if (!session) {
      return null;
    }

    return this.toResponse(session);
  }

  private toResponse(session: Record<string, any>) {
    return {
      id: session.id,
      userId: session.userId,
      phoneNumber: session.phoneNumber,
      status: session.status,
      lastActiveAt: session.lastActiveAt,
      lastHeartbeatAt: session.lastHeartbeatAt,
      reconnectCount: session.reconnectCount,
      createdAt: session.createdAt,
      hasCreds: session.encryptedCreds !== null && session.encryptedCreds !== undefined,
    };
  }
}
