import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { EVENT_NAMES, WHATSAPP_CONFIG } from '@/common/constants';
import { WhatsAppPhoneInactiveEvent } from '@/events/event-bus';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * WhatsApp unlinks companion devices (Wazelo included) once the primary phone
 * has been offline for 14 days. Daily, warn owners whose phone hasn't been
 * seen for a while — at day 10 and again at day 13. Repeats are deduplicated
 * by the notification layer.
 */
@Injectable()
export class PhoneInactivityWorker {
  private readonly logger = new Logger(PhoneInactivityWorker.name);

  constructor(
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async checkPhoneInactivity(): Promise<void> {
    const before = new Date(Date.now() - WHATSAPP_CONFIG.PHONE_INACTIVE_WARN_DAYS * DAY_MS);
    const sessions = await this.sessionRepo.findPhoneInactiveSessions(before);

    for (const session of sessions) {
      const lastPhoneActivityAt = session.lastPhoneActivityAt!;
      const inactiveDays = Math.floor((Date.now() - lastPhoneActivityAt.getTime()) / DAY_MS);

      this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_PHONE_INACTIVE, {
        sessionId: session.id,
        orgId: session.orgId,
        userId: session.userId,
        phoneNumber: session.phoneNumber,
        lastPhoneActivityAt,
        inactiveDays,
        daysLeft: Math.max(0, WHATSAPP_CONFIG.PHONE_UNLINK_DAYS - inactiveDays),
        final: inactiveDays >= WHATSAPP_CONFIG.PHONE_INACTIVE_FINAL_DAYS,
      } satisfies WhatsAppPhoneInactiveEvent);
    }

    if (sessions.length) {
      this.logger.log(`Phone inactivity: ${sessions.length} session(s) past ${WHATSAPP_CONFIG.PHONE_INACTIVE_WARN_DAYS} days`);
    }
  }
}
