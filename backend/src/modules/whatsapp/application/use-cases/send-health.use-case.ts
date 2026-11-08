import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { WhatsAppSessionRepository } from '../../infrastructure/repositories/whatsapp-session.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { AccountSafetyService, SendHealth } from '@/modules/messages/domain/services/account-safety.service';
import type { SendingLimits } from '@/modules/messages/domain/services/send-safety.policy';
import { UpdateSendingLimitsDto } from '../dto/update-sending-limits.dto';

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

  async getForSession(sessionId: string, orgId: string): Promise<SendHealth> {
    const health = await this.accountSafety.getHealth(orgId, sessionId);
    if (!health) throw new NotFoundException('WhatsApp number not found');
    return health;
  }

  /** Admin sets the user's own number's limits. */
  async updateLimitsForUser(userId: string, orgId: string, dto: UpdateSendingLimitsDto): Promise<SendHealth> {
    const session = await this.sessionRepo.findActiveByUserId(userId, orgId);
    if (!session) throw new NotFoundException('No WhatsApp number linked');
    return this.updateLimits(session.id, orgId, userId, dto);
  }

  /**
   * Admin sets a number's sending limits. By default a number has no daily cap
   * (the plan's message limit governs volume); these are optional Wazelo
   * safeguards (WhatsApp publishes no limits for linked devices), bounded by
   * SENDING_LIMIT_BOUNDS. Every change is audited with before/after values.
   */
  async updateLimits(
    sessionId: string,
    orgId: string,
    userId: string,
    dto: UpdateSendingLimitsDto,
  ): Promise<SendHealth> {
    const before = await this.getForSession(sessionId, orgId);

    const next: SendingLimits = {};
    if (typeof dto.warmupEnabled === 'boolean') next.warmupEnabled = dto.warmupEnabled;
    for (const key of ['warmupStage', 'dailyBulkCap', 'dailyColdCap', 'bulkGapMinMs', 'bulkGapMaxMs'] as const) {
      const value = dto[key];
      if (typeof value === 'number') next[key] = value;
    }
    if (next.bulkGapMinMs !== undefined && next.bulkGapMaxMs !== undefined && next.bulkGapMinMs > next.bulkGapMaxMs) {
      throw new BadRequestException('bulkGapMinMs must not be greater than bulkGapMaxMs');
    }
    if (next.dailyBulkCap !== undefined && next.dailyColdCap !== undefined && next.dailyColdCap > next.dailyBulkCap) {
      throw new BadRequestException('dailyColdCap must not be greater than dailyBulkCap (new contacts count toward bulk messages)');
    }

    const saved = await this.accountSafety.setSendingLimits(sessionId, next);

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.ORG_SETTINGS_UPDATED,
      targetType: 'WhatsAppSession',
      targetId: sessionId,
      metadata: { setting: 'whatsapp_sending_limits', before: before.limits, after: saved },
    });
    this.logger.warn(`User ${userId} changed sending limits on session ${sessionId}: ${JSON.stringify(saved)}`);

    return this.getForSession(sessionId, orgId);
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
