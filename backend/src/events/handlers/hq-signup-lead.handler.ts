import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import { SyncSignupLeadUseCase } from '@/modules/hq/application/use-cases/sync-signup-lead.use-case';

/**
 * Wazelo HQ lead sync: sign-ups and their subscription changes. Failures are logged,
 * never thrown — a sign-up or payment must not fail because HQ bookkeeping did.
 */
@Injectable()
export class HqSignupLeadHandler {
  private readonly logger = new Logger(HqSignupLeadHandler.name);

  constructor(private readonly sync: SyncSignupLeadUseCase) {}

  @OnEvent(EVENT_NAMES.USER_REGISTERED, { async: true })
  @OnEvent(EVENT_NAMES.USER_PHONE_ADDED, { async: true })
  async onSignup(event: { userId: string }) {
    if (!event?.userId) return;
    await this.run(`sign-up ${event.userId}`, () => this.sync.fromSignup(event.userId));
  }

  @OnEvent(EVENT_NAMES.SUBSCRIPTION_TRIAL_STARTED, { async: true })
  @OnEvent(EVENT_NAMES.SUBSCRIPTION_TRIAL_CONVERTED, { async: true })
  @OnEvent(EVENT_NAMES.SUBSCRIPTION_CREATED, { async: true })
  @OnEvent(EVENT_NAMES.SUBSCRIPTION_UPGRADED, { async: true })
  @OnEvent(EVENT_NAMES.SUBSCRIPTION_DOWNGRADE_APPLIED, { async: true })
  @OnEvent(EVENT_NAMES.SUBSCRIPTION_REACTIVATED, { async: true })
  @OnEvent(EVENT_NAMES.SUBSCRIPTION_CANCELLED, { async: true })
  @OnEvent(EVENT_NAMES.SUBSCRIPTION_EXPIRED, { async: true })
  async onSubscription(event: { orgId: string }) {
    if (!event?.orgId) return;
    await this.run(`subscription of ${event.orgId}`, () => this.sync.fromSubscription(event.orgId));
  }

  /** Team / freelancer picked at onboarding: refresh the type: segment tag */
  @OnEvent(EVENT_NAMES.ORG_SETTINGS_UPDATED, { async: true })
  async onOrgSettings(event: { orgId: string; changes?: Record<string, unknown> }) {
    if (!event?.orgId || !event.changes || !('orgType' in event.changes)) return;
    await this.run(`org type of ${event.orgId}`, () => this.sync.fromSubscription(event.orgId));
  }

  private async run(what: string, fn: () => Promise<void>) {
    try {
      await fn();
    } catch (err) {
      this.logger.error(
        `HQ lead sync failed for ${what}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }
}
