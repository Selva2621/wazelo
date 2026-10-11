import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { WhatsAppSessionRepository } from '../../infrastructure/repositories/whatsapp-session.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { AccountSafetyService, SendHealth } from '@/modules/messages/domain/services/account-safety.service';

/** Account health for the user's own WhatsApp number, and lifting an auto-pause. */
@Injectable()
export class SendHealthUseCase {
  private readonly logger = new Logger(SendHealthUseCase.name);

  constructor(
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly accountSafety: AccountSafetyService,
    private readonly auditService: AuditService,
  ) {}

  async getForUser(userId: string, orgId: string): Promise<SendHealth | null> {
    const session = await this.sessionRepo.findActiveByUserId(userId, orgId);
    if (!session) return null;
    return this.accountSafety.getHealth(orgId, session.id);
  }

  /** The user accepts the risk and resumes bulk sending before the 24h pause ends. */
  async resumeForUser(userId: string, orgId: string): Promise<SendHealth | null> {
    const session = await this.sessionRepo.findActiveByUserId(userId, orgId);
    if (!session) throw new NotFoundException('No WhatsApp number linked');

    const before = await this.accountSafety.getHealth(orgId, session.id);
    await this.accountSafety.resumeBulkSending(session.id);

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.WHATSAPP_BULK_SENDING_RESUMED,
      targetType: 'WhatsAppSession',
      targetId: session.id,
      metadata: { pausedUntil: before?.paused?.until ?? null, pausedReason: before?.paused?.reason ?? null },
    });
    this.logger.warn(`User ${userId} resumed bulk sending early on session ${session.id}`);

    return this.accountSafety.getHealth(orgId, session.id);
  }
}
