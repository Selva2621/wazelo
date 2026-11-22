import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionRepository } from '@/modules/billing/infrastructure/repositories/subscription.repository';
import { UsageRepository } from '@/modules/billing/infrastructure/repositories/usage.repository';
import { PlanRepository } from '@/modules/billing/infrastructure/repositories/plan.repository';
import { PaymentRepository } from '@/modules/billing/infrastructure/repositories/payment.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { ApplyRenewalCreditUseCase } from '@/modules/billing/application/use-cases/apply-renewal-credit.use-case';
import { EVENT_NAMES } from '@/common/constants';
import { isTrialPlanSlug } from '@/shared/constants/trial-plans';
import { addBillingCycle, consumePrepaidPeriod, readPrepaid } from '@/modules/billing/domain/services/prepaid-period';
import {
  AuditAction,
  SubscriptionStatus,
  UsageMetricType,
  Prisma,
} from '@prisma/client';

@Injectable()
export class BillingCycleWorker {
  private readonly logger = new Logger(BillingCycleWorker.name);

  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly usageRepo: UsageRepository,
    private readonly planRepo: PlanRepository,
    private readonly paymentRepo: PaymentRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly applyRenewalCredit: ApplyRenewalCreditUseCase,
  ) {}

  /**
   * Runs every 5 minutes for subscriptions whose period has run out. No gateway charge
   * here — customers pay each period themselves (Billing → Razorpay checkout).
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCycleRenewal() {
    const now = new Date();

    try {
      const dueSubscriptions = await this.subscriptionRepo.findSubscriptionsDueForRenewal(now);

      for (const subscription of dueSubscriptions) {
        try {
          await this.renewSubscription(subscription);
        } catch (error) {
          this.logger.error(
            `Failed to renew subscription ${subscription.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      if (dueSubscriptions.length > 0) {
        this.logger.log(`Processed ${dueSubscriptions.length} subscription renewals`);
      }
    } catch (error) {
      this.logger.error(`Billing cycle check failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Check for expired trials.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredTrials() {
    const now = new Date();

    try {
      const expiredTrials = await this.subscriptionRepo.findExpiredTrials(now);

      for (const subscription of expiredTrials) {
        try {
          await this.handleTrialExpiry(subscription);
        } catch (error) {
          this.logger.error(
            `Failed to handle trial expiry for ${subscription.id}: ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Trial expiry check failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Check for expired grace periods.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredGracePeriods() {
    const now = new Date();

    try {
      const expiredGrace = await this.subscriptionRepo.findExpiredGracePeriods(now);

      for (const subscription of expiredGrace) {
        try {
          await this.handleGraceExpiry(subscription);
        } catch (error) {
          this.logger.error(
            `Failed to handle grace expiry for ${subscription.id}: ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Grace period check failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Apply scheduled downgrades.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleScheduledDowngrades() {
    const now = new Date();

    try {
      const scheduled = await this.subscriptionRepo.findScheduledDowngrades(now);

      for (const subscription of scheduled) {
        try {
          await this.applyDowngrade(subscription);
        } catch (error) {
          this.logger.error(
            `Failed to apply downgrade for ${subscription.id}: ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Downgrade check failed: ${error.message}`, error.stack);
    }
  }

  /**
   * A period has run out. Nothing is ever charged automatically: free plans renew,
   * paid plans renew only when account credit covers the whole price, otherwise the
   * plan EXPIRES right away (no grace) until the customer pays from Billing.
   * @internal exposed for specs
   */
  async renewSubscription(subscription: any) {
    // Cancelled during the period: it ends now instead of renewing (no charge)
    if (subscription.cancelledAt) {
      await this.endCancelled(subscription);
      return;
    }

    const plan = subscription.plan;
    const now = new Date();

    // Calculate new period
    const newPeriodStart = now;
    const newPeriodEnd = new Date(now);
    if (subscription.billingCycle === 'YEARLY') {
      newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
    } else {
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
    }

    // Periods paid in advance (Renew now before the end): the next one starts exactly where
    // the old one ended, usage resets, one prepaid period is used up. No credit, no charge.
    // Moved under the row lock so a payment landing now can't lose its period.
    if (readPrepaid(subscription.metadata)) {
      const moved = await this.subscriptionRepo.withLock(subscription.id, async (locked, tx) => {
        if (
          !locked ||
          !readPrepaid(locked.metadata) ||
          locked.status !== SubscriptionStatus.ACTIVE ||
          new Date(locked.currentPeriodEnd).getTime() !== new Date(subscription.currentPeriodEnd).getTime()
        ) {
          return null; // changed meanwhile: the next run looks again
        }
        const start = new Date(locked.currentPeriodEnd);
        const end = addBillingCycle(start, locked.billingCycle);
        await this.subscriptionRepo.transitionStatus(
          locked.id,
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.ACTIVE,
          {
            currentPeriodStart: start,
            currentPeriodEnd: end,
            metadata: consumePrepaidPeriod(locked.metadata, end, locked.billingCycle) as Prisma.InputJsonValue,
          },
          tx,
        );
        return { start, end };
      });
      if (moved) {
        // Its PAID invoice was created with the payment
        await this.completeRenewal(subscription, moved.start, moved.end, plan, { invoiceExists: true, alreadyMoved: true });
        this.logger.log(`Subscription ${subscription.id} renewed from a prepaid period`);
      }
      return;
    }

    // For free plans, just renew
    if (subscription.priceInCents === 0) {
      await this.completeRenewal(subscription, newPeriodStart, newPeriodEnd, plan);
      return;
    }

    // Account credit in the subscription currency renews the plan only when it covers the
    // whole price (partial credit is left untouched). Idempotent per renewal — keyed on the
    // period being renewed, which only moves once the renewal completes
    const credit = await this.applyRenewalCredit.execute({
      orgId: subscription.orgId,
      subscriptionId: subscription.id,
      priceInCents: subscription.priceInCents,
      currency: subscription.currency,
      periodStart: newPeriodStart,
      periodEnd: newPeriodEnd,
      renewalKey: `${subscription.id}:${new Date(subscription.currentPeriodEnd).toISOString()}`,
      planLine: this.planLine(subscription, plan),
      requireFullCover: true,
    });

    if (credit && credit.amountDueInCents === 0) {
      await this.paymentRepo.markInvoicePaid(credit.invoiceId, {});
      await this.completeRenewal(subscription, newPeriodStart, newPeriodEnd, plan, { invoiceExists: true });
      this.logger.log(
        `Subscription ${subscription.id} renewal covered by account credit (${credit.appliedInCents} ${subscription.currency})`,
      );
      return;
    }

    // Not paid for the next period: the plan ends now (data kept; paying restores it)
    await this.expireUnpaid(subscription);
  }

  /** Paid period ended without a payment → EXPIRED immediately (no grace for paid renewals) */
  private async expireUnpaid(subscription: any) {
    const previousStatus = subscription.status as SubscriptionStatus;
    const expired = await this.subscriptionRepo.transitionStatus(
      subscription.id,
      [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
      SubscriptionStatus.EXPIRED,
    );
    if (!expired) return;

    await this.subscriptionRepo.recordEvent({
      orgId: subscription.orgId,
      subscriptionId: subscription.id,
      previousStatus,
      newStatus: SubscriptionStatus.EXPIRED,
      reason: 'Paid period ended without a renewal payment',
      metadata: {
        type: 'period_ended_unpaid',
        periodEnd: new Date(subscription.currentPeriodEnd).toISOString(),
      },
    });

    this.eventEmitter.emit(EVENT_NAMES.SUBSCRIPTION_EXPIRED, {
      subscriptionId: subscription.id,
      orgId: subscription.orgId,
      planId: subscription.planId,
      paidPeriodEnded: true,
    });

    await this.auditService.log({
      orgId: subscription.orgId,
      action: AuditAction.SUBSCRIPTION_EXPIRED,
      targetType: 'Subscription',
      targetId: subscription.id,
      metadata: { reason: 'period_ended_unpaid' },
      source: 'worker',
    });

    this.logger.log(`Subscription ${subscription.id} expired: paid period ended unpaid`);
  }

  private planLine(subscription: any, plan: any) {
    return {
      description: `${plan.name} plan - ${subscription.billingCycle.toLowerCase()}`,
      amount: subscription.priceInCents,
      quantity: 1,
    };
  }

  /**
   * @param opts.invoiceExists the renewal invoice was already created (credit applied / prepaid)
   * @param opts.alreadyMoved the subscription already carries the new period (prepaid path)
   */
  private async completeRenewal(
    subscription: any,
    newPeriodStart: Date,
    newPeriodEnd: Date,
    plan: any,
    opts: { invoiceExists?: boolean; alreadyMoved?: boolean } = {},
  ) {
    // Update subscription period
    const previousStatus = subscription.status as SubscriptionStatus;
    if (!opts.alreadyMoved) {
      const renewed = await this.subscriptionRepo.transitionStatus(
        subscription.id,
        [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
        SubscriptionStatus.ACTIVE,
        {
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
        },
      );
      if (!renewed) return;
    }

    // Reset usage counters
    const limits: Record<UsageMetricType, number> = {
      [UsageMetricType.MESSAGES_SENT]: plan.maxMessagesPerMonth,
      [UsageMetricType.ACTIVE_USERS]: plan.maxUsers,
      [UsageMetricType.WHATSAPP_SESSIONS]: plan.maxWhatsappSessions,
      [UsageMetricType.CAMPAIGN_EXECUTIONS]: plan.maxCampaignsPerMonth,
      [UsageMetricType.API_CALLS]: plan.maxApiCallsPerMonth,
      [UsageMetricType.AI_CREDITS]: plan.aiCreditsPerMonth,
      [UsageMetricType.MESSAGE_TEMPLATES]: plan.maxMessageTemplates,
    };

    await this.usageRepo.resetUsageForOrg(
      subscription.orgId,
      newPeriodStart,
      newPeriodEnd,
      limits,
    );

    // Generate invoice (unless credit application already created this renewal's invoice)
    if (!opts.invoiceExists) {
      const invoiceNumber = await this.paymentRepo.getNextInvoiceNumber();
      await this.paymentRepo.createInvoice({
        orgId: subscription.orgId,
        subscriptionId: subscription.id,
        invoiceNumber,
        amountInCents: subscription.priceInCents,
        currency: subscription.currency,
        periodStart: newPeriodStart,
        periodEnd: newPeriodEnd,
        lineItems: [this.planLine(subscription, plan)],
        dueDate: newPeriodStart,
      });
    }

    // Record event
    await this.subscriptionRepo.recordEvent({
      orgId: subscription.orgId,
      subscriptionId: subscription.id,
      previousStatus,
      newStatus: SubscriptionStatus.ACTIVE,
      reason: 'Subscription renewed',
      metadata: {
        newPeriodStart: newPeriodStart.toISOString(),
        newPeriodEnd: newPeriodEnd.toISOString(),
      },
    });

    // Emit event
    this.eventEmitter.emit(EVENT_NAMES.SUBSCRIPTION_RENEWED, {
      subscriptionId: subscription.id,
      orgId: subscription.orgId,
      planId: plan.id,
      newPeriodStart: newPeriodStart.toISOString(),
      newPeriodEnd: newPeriodEnd.toISOString(),
    });

    this.eventEmitter.emit(EVENT_NAMES.USAGE_COUNTER_RESET, {
      orgId: subscription.orgId,
      metricTypes: Object.values(UsageMetricType),
      periodStart: newPeriodStart.toISOString(),
      periodEnd: newPeriodEnd.toISOString(),
    });

    // Audit
    await this.auditService.log({
      orgId: subscription.orgId,
      action: AuditAction.SUBSCRIPTION_RENEWED,
      targetType: 'Subscription',
      targetId: subscription.id,
      source: 'worker',
    });

    this.logger.log(`Subscription ${subscription.id} renewed successfully`);
  }

  /**
   * The customer cancelled during the period; now that it has run out the plan ends
   * (CANCELLED, never charged again). "Expired" tells the org and Wazelo HQ access ended.
   */
  private async endCancelled(subscription: any) {
    const ended = await this.subscriptionRepo.transitionStatus(
      subscription.id,
      [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
      SubscriptionStatus.CANCELLED,
    );
    if (!ended) return;

    await this.subscriptionRepo.recordEvent({
      orgId: subscription.orgId,
      subscriptionId: subscription.id,
      previousStatus: subscription.status,
      newStatus: SubscriptionStatus.CANCELLED,
      reason: 'Cancelled plan reached the end of its period',
      metadata: { type: 'cancel_at_period_end_applied' },
    });

    this.eventEmitter.emit(EVENT_NAMES.SUBSCRIPTION_EXPIRED, {
      subscriptionId: subscription.id,
      orgId: subscription.orgId,
      planId: subscription.planId,
    });

    this.logger.log(`Subscription ${subscription.id} ended at period end (cancelled earlier)`);
  }

  private async handleTrialExpiry(subscription: any) {
    // Trial cancelled earlier: it ends with the trial, no grace period
    if (subscription.cancelledAt) {
      await this.endCancelled(subscription);
      return;
    }

    const plan = subscription.plan;

    // A genuinely free plan stays ACTIVE. The free *trial* plans don't: the trial ends,
    // grace starts, then access stops until the org pays.
    if (subscription.priceInCents === 0 && !isTrialPlanSlug(plan?.slug)) {
      const converted = await this.subscriptionRepo.transitionStatus(
        subscription.id,
        SubscriptionStatus.TRIAL,
        SubscriptionStatus.ACTIVE,
      );
      if (converted) {
        await this.subscriptionRepo.recordEvent({
          orgId: subscription.orgId,
          subscriptionId: subscription.id,
          previousStatus: SubscriptionStatus.TRIAL,
          newStatus: SubscriptionStatus.ACTIVE,
          reason: 'Free trial ended — continued on free plan',
          metadata: { type: 'free_trial_converted' },
        });
      }
      return;
    }

    // For paid plans, enter grace period
    const graceEndDate = new Date();
    graceEndDate.setDate(graceEndDate.getDate() + (plan.gracePeriodDays || 3));

    await this.subscriptionRepo.transitionStatus(
      subscription.id,
      SubscriptionStatus.TRIAL,
      SubscriptionStatus.GRACE_PERIOD,
      { graceEndsAt: graceEndDate },
    );

    await this.subscriptionRepo.recordEvent({
      orgId: subscription.orgId,
      subscriptionId: subscription.id,
      previousStatus: SubscriptionStatus.TRIAL,
      newStatus: SubscriptionStatus.GRACE_PERIOD,
      reason: 'Trial period expired',
    });

    this.eventEmitter.emit(EVENT_NAMES.SUBSCRIPTION_GRACE_PERIOD, {
      subscriptionId: subscription.id,
      orgId: subscription.orgId,
      graceEndsAt: graceEndDate.toISOString(),
    });

    await this.auditService.log({
      orgId: subscription.orgId,
      action: AuditAction.SUBSCRIPTION_GRACE_PERIOD_ENTERED,
      targetType: 'Subscription',
      targetId: subscription.id,
      source: 'worker',
    });

    this.logger.log(
      `Subscription ${subscription.id} trial expired, entered grace period until ${graceEndDate.toISOString()}`,
    );
  }

  private async handleGraceExpiry(subscription: any) {
    await this.subscriptionRepo.transitionStatus(
      subscription.id,
      SubscriptionStatus.GRACE_PERIOD,
      SubscriptionStatus.EXPIRED,
    );

    await this.subscriptionRepo.recordEvent({
      orgId: subscription.orgId,
      subscriptionId: subscription.id,
      previousStatus: SubscriptionStatus.GRACE_PERIOD,
      newStatus: SubscriptionStatus.EXPIRED,
      reason: 'Grace period expired',
    });

    this.eventEmitter.emit(EVENT_NAMES.SUBSCRIPTION_EXPIRED, {
      subscriptionId: subscription.id,
      orgId: subscription.orgId,
      planId: subscription.planId,
    });

    await this.auditService.log({
      orgId: subscription.orgId,
      action: AuditAction.SUBSCRIPTION_EXPIRED,
      targetType: 'Subscription',
      targetId: subscription.id,
      source: 'worker',
    });

    this.logger.log(`Subscription ${subscription.id} expired after grace period`);
  }

  private async applyDowngrade(subscription: any) {
    const newPlan = await this.planRepo.findById(subscription.scheduledPlanId);
    if (!newPlan) {
      this.logger.error(
        `Scheduled downgrade plan ${subscription.scheduledPlanId} not found for subscription ${subscription.id}`,
      );
      await this.subscriptionRepo.clearScheduledDowngrade(subscription.id);
      return;
    }

    const previousPlanId = subscription.planId;

    // Apply the downgrade
    await this.subscriptionRepo.updatePlan(
      subscription.id,
      newPlan.id,
      newPlan.priceInCents,
    );
    await this.subscriptionRepo.clearScheduledDowngrade(subscription.id);

    // Update usage limits
    const limits: Record<UsageMetricType, number> = {
      [UsageMetricType.MESSAGES_SENT]: newPlan.maxMessagesPerMonth,
      [UsageMetricType.ACTIVE_USERS]: newPlan.maxUsers,
      [UsageMetricType.WHATSAPP_SESSIONS]: newPlan.maxWhatsappSessions,
      [UsageMetricType.CAMPAIGN_EXECUTIONS]: newPlan.maxCampaignsPerMonth,
      [UsageMetricType.API_CALLS]: newPlan.maxApiCallsPerMonth,
      [UsageMetricType.AI_CREDITS]: newPlan.aiCreditsPerMonth,
      [UsageMetricType.MESSAGE_TEMPLATES]: newPlan.maxMessageTemplates,
    };

    await this.usageRepo.resetUsageForOrg(
      subscription.orgId,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd,
      limits,
    );

    await this.subscriptionRepo.recordEvent({
      orgId: subscription.orgId,
      subscriptionId: subscription.id,
      previousStatus: subscription.status,
      newStatus: subscription.status,
      previousPlanId,
      newPlanId: newPlan.id,
      reason: 'Scheduled downgrade applied',
    });

    this.eventEmitter.emit(EVENT_NAMES.SUBSCRIPTION_DOWNGRADE_APPLIED, {
      subscriptionId: subscription.id,
      orgId: subscription.orgId,
      previousPlanId,
      newPlanId: newPlan.id,
    });

    await this.auditService.log({
      orgId: subscription.orgId,
      action: AuditAction.SUBSCRIPTION_DOWNGRADE_APPLIED,
      targetType: 'Subscription',
      targetId: subscription.id,
      metadata: {
        previousPlanId,
        newPlanId: newPlan.id,
        newPlanName: newPlan.name,
      },
      source: 'worker',
    });

    this.logger.log(
      `Subscription ${subscription.id} downgraded to plan ${newPlan.name}`,
    );
  }
}
