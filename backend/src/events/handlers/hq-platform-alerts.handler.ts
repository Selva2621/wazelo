import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import type {
  PaymentFailedEvent,
  SubscriptionExpiredEvent,
  SubscriptionGracePeriodEvent,
  SubscriptionRenewalDueEvent,
} from '@/events/event-bus';
import { renewalDueDetail } from '@/modules/billing/domain/services/renewal-reminders';
import { SendPlatformAlertUseCase } from '@/modules/hq/application/use-cases/send-platform-alert.use-case';
import { PlatformAlertKey, dayScope } from '@/modules/hq/domain/services/platform-alerts';
import { HqWhatsappSender } from '@/modules/hq/application/services/hq-whatsapp-sender.service';

/**
 * Wazelo → customer WhatsApp alerts from Wazelo HQ, beside the existing email / in-app
 * notices. Failures are logged, never thrown — billing and sessions must not fail
 * because an HQ alert did.
 */
@Injectable()
export class HqPlatformAlertsHandler {
  private readonly logger = new Logger(HqPlatformAlertsHandler.name);

  constructor(
    private readonly alerts: SendPlatformAlertUseCase,
    private readonly sender: HqWhatsappSender,
  ) {}

  /** "Sign in with WhatsApp code": the code goes out from HQ's number */
  @OnEvent(EVENT_NAMES.LOGIN_CODE_REQUESTED, { async: true })
  async onLoginCode(e: { phone: string; code: string; idempotencyKey: string }) {
    try {
      const sent = await this.sender.sendCode(e.phone, e.code, e.idempotencyKey);
      if (!sent) this.logger.warn('Sign-in code not sent: HQ has no connected number or approved template');
    } catch (err) {
      this.logger.error(`Sign-in code send failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Trial or paid plan ended. {{3}} says what to do (the template wording stays generic) */
  @OnEvent(EVENT_NAMES.SUBSCRIPTION_EXPIRED, { async: true })
  async onExpired(e: SubscriptionExpiredEvent) {
    const detail = e.paidPeriodEnded ? 'renew in Billing to continue' : 'choose a plan in Billing to continue';
    await this.send('trial_expired', e.orgId, e.subscriptionId, detail);
  }

  /** Paid plan ends in 3 days / 1 day — no auto-charge, so the customer is asked to renew */
  @OnEvent(EVENT_NAMES.SUBSCRIPTION_RENEWAL_DUE, { async: true })
  async onRenewalDue(e: SubscriptionRenewalDueEvent) {
    await this.send('renewal_due', e.orgId, e.reminderKey, renewalDueDetail(e.daysLeft, e.periodEnd));
  }

  @OnEvent(EVENT_NAMES.SUBSCRIPTION_GRACE_PERIOD, { async: true })
  async onGrace(e: SubscriptionGracePeriodEvent) {
    await this.send('grace_period', e.orgId, e.subscriptionId, new Date(e.graceEndsAt).toDateString());
  }

  @OnEvent(EVENT_NAMES.PAYMENT_FAILED, { async: true })
  async onPaymentFailed(e: PaymentFailedEvent) {
    await this.send('payment_failed', e.orgId, e.paymentId);
  }

  /** Once a day per number at most — a flapping connection doesn't spam the customer */
  @OnEvent(EVENT_NAMES.WHATSAPP_SESSION_DISCONNECTED, { async: true })
  async onDisconnected(e: { orgId: string; sessionId: string }) {
    await this.send('whatsapp_disconnected', e.orgId, `${e.sessionId}:${dayScope()}`);
  }

  private async send(alert: PlatformAlertKey, orgId: string | undefined, scope: string, detail?: string) {
    if (!orgId) return;
    try {
      await this.alerts.execute(alert, orgId, scope, detail);
    } catch (err) {
      this.logger.error(`HQ alert ${alert} for ${orgId} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
