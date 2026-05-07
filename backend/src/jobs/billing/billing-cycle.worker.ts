import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionRepository } from '@/modules/billing/infrastructure/repositories/subscription.repository';
import { UsageRepository } from '@/modules/billing/infrastructure/repositories/usage.repository';
import { PlanRepository } from '@/modules/billing/infrastructure/repositories/plan.repository';
import { PaymentRepository } from '@/modules/billing/infrastructure/repositories/payment.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { StripePaymentService } from '@/modules/billing/domain/services/stripe-payment.service';
import { EVENT_NAMES } from '@/common/constants';
import {
  AuditAction,
  SubscriptionStatus,
  UsageMetricType,
  InvoiceStatus,
} from '@prisma/client';

@Injectable()
export class BillingCycleWorker {
  private readonly logger = new Logger(BillingCycleWorker.name);

  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly usageRepo: UsageRepository,
    private readonly planRepo: PlanRepository,
    private readonly paymentRepo: PaymentRepository,
    private readonly stripePayment: StripePaymentService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Runs every 5 minutes to check for subscriptions that need renewal.
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

  private async renewSubscription(subscription: any) {
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

    // For free plans, just renew
    if (subscription.priceInCents === 0) {
      await this.completeRenewal(subscription, newPeriodStart, newPeriodEnd, plan);
      return;
    }

    // For paid plans, create payment record
    // In production, this would call the payment gateway
    const payment = await this.paymentRepo.createPayment({
      orgId: subscription.orgId,
      subscriptionId: subscription.id,
      amountInCents: subscription.priceInCents,
      currency: subscription.currency,
      idempotencyKey: `renewal-${subscription.id}-${newPeriodStart.toISOString().slice(0, 10)}`,
    });

    // Process payment through Stripe
    await this.paymentRepo.transitionPaymentStatus(payment.id, 'PENDING', 'PROCESSING');

    const result = await this.stripePayment.chargePayment(
      subscription.priceInCents,
      subscription.currency,
      subscription.externalCustomerId || '',
      subscription.externalCustomerId || '', // Stripe uses default payment method from customer
      payment.idempotencyKey || payment.id,
      `Wazelo CRM subscription renewal: ${plan?.name || subscription.id}`,
    );

    if (result.success) {
      await this.paymentRepo.transitionPaymentStatus(payment.id, 'PROCESSING', 'SUCCEEDED');
      await this.completeRenewal(subscription, newPeriodStart, newPeriodEnd, plan);

      this.eventEmitter.emit(EVENT_NAMES.PAYMENT_SUCCEEDED, {
        paymentId: payment.id,
        orgId: subscription.orgId,
        subscriptionId: subscription.id,
        amountInCents: subscription.priceInCents,
      });

      this.logger.log(`Payment ${payment.id} succeeded for subscription ${subscription.id} renewal`);
    } else {
      await this.paymentRepo.transitionPaymentStatus(payment.id, 'PROCESSING', 'FAILED');

      // Schedule retry
      const nextRetryAt = new Date(Date.now() + 3600_000); // 1 hour
      await this.paymentRepo.schedulePaymentRetry(payment.id, nextRetryAt);

      this.eventEmitter.emit(EVENT_NAMES.PAYMENT_FAILED, {
        paymentId: payment.id,
        orgId: subscription.orgId,
        subscriptionId: subscription.id,
        reason: result.error || 'Payment processing failed',
        retryCount: 0,
      });

      this.logger.warn(`Payment ${payment.id} failed for subscription ${subscription.id}: ${result.error}`);
    }
  }

  private async completeRenewal(
    subscription: any,
    newPeriodStart: Date,
    newPeriodEnd: Date,
    plan: any,
  ) {
    // Update subscription period
    await this.subscriptionRepo.transitionStatus(
      subscription.id,
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.ACTIVE,
      {
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd,
      },
    );

    // Reset usage counters
    const limits: Record<UsageMetricType, number> = {
      [UsageMetricType.MESSAGES_SENT]: plan.maxMessagesPerMonth,
      [UsageMetricType.ACTIVE_USERS]: plan.maxUsers,
      [UsageMetricType.WHATSAPP_SESSIONS]: plan.maxWhatsappSessions,
      [UsageMetricType.CAMPAIGN_EXECUTIONS]: plan.maxCampaignsPerMonth,
      [UsageMetricType.API_CALLS]: plan.maxMessagesPerMonth,
      [UsageMetricType.AI_CREDITS]: plan.aiCreditsPerMonth,
      [UsageMetricType.MESSAGE_TEMPLATES]: plan.maxMessageTemplates,
    };

    await this.usageRepo.resetUsageForOrg(
      subscription.orgId,
      newPeriodStart,
      newPeriodEnd,
      limits,
    );

    // Generate invoice
    const invoiceNumber = await this.paymentRepo.getNextInvoiceNumber();
    await this.paymentRepo.createInvoice({
      orgId: subscription.orgId,
      subscriptionId: subscription.id,
      invoiceNumber,
      amountInCents: subscription.priceInCents,
      currency: subscription.currency,
      periodStart: newPeriodStart,
      periodEnd: newPeriodEnd,
      lineItems: [
        {
          description: `${plan.name} plan - ${subscription.billingCycle.toLowerCase()}`,
          amount: subscription.priceInCents,
          quantity: 1,
        },
      ],
      dueDate: newPeriodStart,
    });

    // Record event
    await this.subscriptionRepo.recordEvent({
      orgId: subscription.orgId,
      subscriptionId: subscription.id,
      previousStatus: SubscriptionStatus.ACTIVE,
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

  private async handleTrialExpiry(subscription: any) {
    const plan = subscription.plan;

    // If it's a free plan, transition to ACTIVE
    if (subscription.priceInCents === 0) {
      await this.subscriptionRepo.transitionStatus(
        subscription.id,
        SubscriptionStatus.TRIAL,
        SubscriptionStatus.ACTIVE,
      );
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
      [UsageMetricType.API_CALLS]: newPlan.maxMessagesPerMonth,
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
