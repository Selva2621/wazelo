import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionStatus } from '@prisma/client';
import { EVENT_NAMES } from '@/common/constants';
import type { SubscriptionRenewalDueEvent } from '@/events/event-bus';
import { SubscriptionRepository } from '../../infrastructure/repositories/subscription.repository';
import { RENEWAL_REMINDER_DAYS } from '../../domain/services/renewal-reminders';
import { readPrepaid } from '../../domain/services/prepaid-period';

const DAY_MS = 24 * 60 * 60 * 1000;

const REMINDER_EVENT_TYPE = 'renewal_reminder';

/**
 * Daily: paid plans are never charged automatically, so admins are reminded to pay
 * 3 days and 1 day before the period ends. Each (subscription, period end, N days) is
 * reminded once (prepaid plans are skipped) — a marker subscription event is recorded before the event goes out, so
 * a re-run of the cron sends nothing twice. Cancelled-at-period-end plans are skipped.
 * The SUBSCRIPTION_RENEWAL_DUE event fans out to in-app + email (admins) and the
 * Wazelo HQ WhatsApp alert.
 */
@Injectable()
export class SendRenewalRemindersUseCase {
  private readonly logger = new Logger(SendRenewalRemindersUseCase.name);

  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly events: EventEmitter2,
  ) {}

  async execute(now = new Date()): Promise<number> {
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    let sent = 0;

    for (const days of RENEWAL_REMINDER_DAYS) {
      // Periods ending on that calendar day (UTC)
      const from = new Date(today + days * DAY_MS);
      const to = new Date(from.getTime() + DAY_MS);

      for (const sub of await this.subscriptionRepo.findPaidRenewalsEndingBetween(from, to)) {
        // Next period already paid: nothing to remind about
        if (readPrepaid(sub.metadata)) continue;
        const periodEnd = new Date(sub.currentPeriodEnd).toISOString();
        const key = `${sub.id}:${periodEnd}:${days}d`;
        if (await this.subscriptionRepo.hasEventWithKey(sub.id, REMINDER_EVENT_TYPE, key)) continue;

        await this.subscriptionRepo.recordEvent({
          orgId: sub.orgId,
          subscriptionId: sub.id,
          previousStatus: SubscriptionStatus.ACTIVE,
          newStatus: SubscriptionStatus.ACTIVE,
          reason: `Renewal reminder: plan ends in ${days} day${days === 1 ? '' : 's'}`,
          metadata: { type: REMINDER_EVENT_TYPE, key, daysLeft: days, periodEnd },
        });

        this.events.emit(EVENT_NAMES.SUBSCRIPTION_RENEWAL_DUE, {
          subscriptionId: sub.id,
          orgId: sub.orgId,
          planName: (sub as { plan?: { name?: string } | null }).plan?.name ?? 'current',
          daysLeft: days,
          periodEnd,
          reminderKey: key,
        } satisfies SubscriptionRenewalDueEvent);
        sent++;
      }
    }

    if (sent) this.logger.log(`Sent ${sent} renewal reminder(s)`);
    return sent;
  }
}
