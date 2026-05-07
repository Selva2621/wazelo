import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AppWebSocketGateway } from '@/infrastructure/websocket/websocket.gateway';
import { NotificationDispatchService } from '@/modules/notifications/domain/services/notification-dispatch.service';
import { EVENT_NAMES } from '@/common/constants';
import {
  SubscriptionCreatedEvent,
  SubscriptionUpgradedEvent,
  SubscriptionCancelledEvent,
  SubscriptionExpiredEvent,
  SubscriptionGracePeriodEvent,
  PaymentSucceededEvent,
  PaymentFailedEvent,
  UsageLimitReachedEvent,
  UsageSoftLimitWarningEvent,
  UsageCounterResetEvent,
} from '../event-bus';

@Injectable()
export class BillingEventsHandler {
  private readonly logger = new Logger(BillingEventsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: AppWebSocketGateway,
    private readonly notificationService: NotificationDispatchService,
  ) {}

  @OnEvent(EVENT_NAMES.SUBSCRIPTION_CREATED)
  async onSubscriptionCreated(event: SubscriptionCreatedEvent) {
    this.logger.log(
      `Subscription created: ${event.subscriptionId} for org ${event.orgId} on plan ${event.planName}`,
    );

    this.wsGateway.emitToOrg(event.orgId, 'billing:subscription_created', {
      subscriptionId: event.subscriptionId,
      planName: event.planName,
      status: event.status,
    });

    const adminIds = await this.getOrgAdminIds(event.orgId);
    if (adminIds.length > 0) {
      await this.notificationService.dispatchToOrg(
        event.orgId,
        adminIds,
        'SYSTEM_ALERT',
        'NORMAL',
        `Subscribed to ${event.planName}`,
        `Your organization has been subscribed to the ${event.planName} plan.`,
        { subscriptionId: event.subscriptionId, planName: event.planName },
      );
    }
  }

  @OnEvent(EVENT_NAMES.SUBSCRIPTION_UPGRADED)
  async onSubscriptionUpgraded(event: SubscriptionUpgradedEvent) {
    this.logger.log(
      `Subscription ${event.subscriptionId} upgraded for org ${event.orgId}`,
    );

    this.wsGateway.emitToOrg(event.orgId, 'billing:subscription_upgraded', {
      subscriptionId: event.subscriptionId,
      previousPlanId: event.previousPlanId,
      newPlanId: event.newPlanId,
      proratedAmountInCents: event.proratedAmountInCents,
    });

    const adminIds = await this.getOrgAdminIds(event.orgId);
    if (adminIds.length > 0) {
      await this.notificationService.dispatchToOrg(
        event.orgId,
        adminIds,
        'SYSTEM_ALERT',
        'NORMAL',
        'Plan Upgraded',
        `Your subscription has been upgraded. Prorated charge: $${(event.proratedAmountInCents / 100).toFixed(2)}.`,
        { subscriptionId: event.subscriptionId },
      );
    }
  }

  @OnEvent(EVENT_NAMES.SUBSCRIPTION_CANCELLED)
  async onSubscriptionCancelled(event: SubscriptionCancelledEvent) {
    this.logger.log(
      `Subscription ${event.subscriptionId} cancelled for org ${event.orgId}`,
    );

    this.wsGateway.emitToOrg(event.orgId, 'billing:subscription_cancelled', {
      subscriptionId: event.subscriptionId,
      reason: event.reason,
    });

    const adminIds = await this.getOrgAdminIds(event.orgId);
    if (adminIds.length > 0) {
      await this.notificationService.dispatchToOrg(
        event.orgId,
        adminIds,
        'SUBSCRIPTION_EXPIRING',
        'HIGH',
        'Subscription Cancelled',
        `Your subscription has been cancelled.${event.reason ? ` Reason: ${event.reason}` : ''} You can reactivate at any time.`,
        { subscriptionId: event.subscriptionId },
      );
    }
  }

  @OnEvent(EVENT_NAMES.SUBSCRIPTION_EXPIRED)
  async onSubscriptionExpired(event: SubscriptionExpiredEvent) {
    this.logger.log(
      `Subscription ${event.subscriptionId} expired for org ${event.orgId}`,
    );

    this.wsGateway.emitToOrg(event.orgId, 'billing:subscription_expired', {
      subscriptionId: event.subscriptionId,
      planId: event.planId,
    });

    const adminIds = await this.getOrgAdminIds(event.orgId);
    if (adminIds.length > 0) {
      await this.notificationService.dispatchToOrg(
        event.orgId,
        adminIds,
        'SUBSCRIPTION_EXPIRING',
        'HIGH',
        'Subscription Expired',
        'Your subscription has expired. Reactivate now to restore access to all features.',
        { subscriptionId: event.subscriptionId },
      );
    }
  }

  @OnEvent(EVENT_NAMES.SUBSCRIPTION_GRACE_PERIOD)
  async onSubscriptionGracePeriod(event: SubscriptionGracePeriodEvent) {
    this.logger.log(
      `Subscription ${event.subscriptionId} entered grace period for org ${event.orgId}, ends at ${event.graceEndsAt}`,
    );

    this.wsGateway.emitToOrg(event.orgId, 'billing:grace_period', {
      subscriptionId: event.subscriptionId,
      graceEndsAt: event.graceEndsAt,
    });

    const adminIds = await this.getOrgAdminIds(event.orgId);
    if (adminIds.length > 0) {
      await this.notificationService.dispatchToOrg(
        event.orgId,
        adminIds,
        'SUBSCRIPTION_EXPIRING',
        'HIGH',
        'Grace Period — Action Required',
        `Your subscription is in a grace period ending ${new Date(event.graceEndsAt).toLocaleDateString()}. Update your payment method to avoid service interruption.`,
        { subscriptionId: event.subscriptionId, graceEndsAt: event.graceEndsAt },
      );
    }
  }

  @OnEvent(EVENT_NAMES.PAYMENT_SUCCEEDED)
  async onPaymentSucceeded(event: PaymentSucceededEvent) {
    this.logger.log(
      `Payment ${event.paymentId} succeeded for org ${event.orgId}: ${event.amountInCents} cents`,
    );

    this.wsGateway.emitToOrg(event.orgId, 'billing:payment_succeeded', {
      paymentId: event.paymentId,
      amountInCents: event.amountInCents,
    });
  }

  @OnEvent(EVENT_NAMES.PAYMENT_FAILED)
  async onPaymentFailed(event: PaymentFailedEvent) {
    this.logger.warn(
      `Payment ${event.paymentId} failed for org ${event.orgId}: ${event.reason}`,
    );

    this.wsGateway.emitToOrg(event.orgId, 'billing:payment_failed', {
      paymentId: event.paymentId,
      reason: event.reason,
      retryCount: event.retryCount,
    });

    const adminIds = await this.getOrgAdminIds(event.orgId);
    if (adminIds.length > 0) {
      await this.notificationService.dispatchToOrg(
        event.orgId,
        adminIds,
        'PAYMENT_FAILED',
        'HIGH',
        'Payment Failed',
        `Payment failed: ${event.reason}. We will retry automatically (attempt ${event.retryCount}). Please update your payment method if the issue persists.`,
        { paymentId: event.paymentId, reason: event.reason, retryCount: event.retryCount },
      );
    }
  }

  @OnEvent(EVENT_NAMES.USAGE_LIMIT_REACHED)
  async onUsageLimitReached(event: UsageLimitReachedEvent) {
    this.logger.warn(
      `Usage limit reached for org ${event.orgId}: ${event.metricType} (${event.currentValue}/${event.limitValue})`,
    );

    this.wsGateway.emitToOrg(event.orgId, 'billing:usage_limit_reached', {
      metricType: event.metricType,
      currentValue: event.currentValue,
      limitValue: event.limitValue,
    });

    const adminIds = await this.getOrgAdminIds(event.orgId);
    if (adminIds.length > 0) {
      await this.notificationService.dispatchToOrg(
        event.orgId,
        adminIds,
        'USAGE_LIMIT_REACHED',
        'HIGH',
        `Usage Limit Reached: ${event.metricType}`,
        `You've reached your ${event.metricType} limit (${event.currentValue}/${event.limitValue}). Upgrade your plan for more capacity.`,
        { metricType: event.metricType, currentValue: event.currentValue, limitValue: event.limitValue },
      );
    }
  }

  @OnEvent(EVENT_NAMES.USAGE_SOFT_LIMIT_WARNING)
  async onUsageSoftLimitWarning(event: UsageSoftLimitWarningEvent) {
    this.logger.log(
      `Soft limit warning for org ${event.orgId}: ${event.metricType} at ${event.percentUsed}% (${event.currentValue}/${event.limitValue})`,
    );

    this.wsGateway.emitToOrg(event.orgId, 'billing:usage_warning', {
      metricType: event.metricType,
      percentUsed: event.percentUsed,
      currentValue: event.currentValue,
      limitValue: event.limitValue,
    });

    const adminIds = await this.getOrgAdminIds(event.orgId);
    if (adminIds.length > 0) {
      await this.notificationService.dispatchToOrg(
        event.orgId,
        adminIds,
        'USAGE_LIMIT_WARNING',
        'NORMAL',
        `Usage Warning: ${event.metricType} at ${event.percentUsed}%`,
        `You've used ${event.percentUsed}% of your ${event.metricType} limit (${event.currentValue}/${event.limitValue}).`,
        { metricType: event.metricType, percentUsed: event.percentUsed },
        `usage-warning-${event.orgId}-${event.metricType}`,
      );
    }
  }

  @OnEvent(EVENT_NAMES.USAGE_COUNTER_RESET)
  async onUsageCounterReset(event: UsageCounterResetEvent) {
    this.logger.log(
      `Usage counters reset for org ${event.orgId}: ${event.metricTypes.join(', ')}`,
    );
  }

  private async getOrgAdminIds(orgId: string): Promise<string[]> {
    const admins = await this.prisma.user.findMany({
      where: {
        orgId,
        role: 'ADMIN',
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: { id: true },
    });
    return admins.map((a) => a.id);
  }
}
