import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditAction, WhatsAppSessionStatus } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { AccountSafetyService } from '@/modules/messages/domain/services/account-safety.service';
import { EVENT_NAMES } from '@/common/constants';

/**
 * Every 15 minutes, checks each connected number's bulk delivery rate and
 * opt-outs. A number that looks like it's being reported gets its bulk
 * sending (campaigns, sequences) paused for 24h — inbox replies keep working.
 */
@Injectable()
export class SendHealthWorker {
  private readonly logger = new Logger(SendHealthWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountSafety: AccountSafetyService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron('0 */15 * * * *')
  async checkSendHealth(): Promise<void> {
    const now = new Date();
    const sessions = await this.prisma.whatsAppSession.findMany({
      where: {
        deletedAt: null,
        status: WhatsAppSessionStatus.CONNECTED,
        OR: [{ sendingPausedUntil: null }, { sendingPausedUntil: { lt: now } }],
      },
      select: { id: true, orgId: true, userId: true, phoneNumber: true },
    });

    for (const session of sessions) {
      try {
        const verdict = await this.accountSafety.evaluateHealth(session.orgId, session.id, now);
        if (verdict.healthy) continue;

        const until = await this.accountSafety.pauseBulkSending(session.id, verdict.reason, now);
        this.logger.warn(`Paused bulk sending on session ${session.id} until ${until.toISOString()}: ${verdict.reason}`);

        await this.auditService.log({
          orgId: session.orgId,
          action: AuditAction.WHATSAPP_BULK_SENDING_PAUSED,
          targetType: 'WhatsAppSession',
          targetId: session.id,
          metadata: {
            reason: verdict.reason,
            pausedUntil: until.toISOString(),
            deliveryRate: verdict.deliveryRate,
            sampled: verdict.sampled,
            optOuts: verdict.optOuts,
          },
        });

        this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_SENDING_PAUSED, {
          sessionId: session.id,
          orgId: session.orgId,
          userId: session.userId,
          phoneNumber: session.phoneNumber,
          reason: verdict.reason,
          pausedUntil: until.toISOString(),
        });
      } catch (error) {
        this.logger.error(`Send health check failed for session ${session.id}: ${error}`);
      }
    }
  }
}
