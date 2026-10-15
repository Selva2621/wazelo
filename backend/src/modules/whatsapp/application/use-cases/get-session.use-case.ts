import { Injectable, NotFoundException } from '@nestjs/common';
import { WhatsAppSessionRepository } from '../../infrastructure/repositories/whatsapp-session.repository';
import { isNumberLost } from '../../domain/services/disconnect-classifier';

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
    if (session) {
      return this.toResponse(session);
    }

    // A logged-out or banned number has no creds left, so it isn't "active" —
    // still return it so the user sees why it stopped and what to do.
    const latest = await this.sessionRepo.findAnyByUserId(userId, orgId);
    if (latest && isNumberLost(latest.disconnectReason)) {
      return this.toResponse(latest);
    }

    return null;
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
      disconnectReason: session.disconnectReason ?? null,
      disconnectCode: session.disconnectCode ?? null,
      linkedAt: session.linkedAt ?? null,
    };
  }
}
