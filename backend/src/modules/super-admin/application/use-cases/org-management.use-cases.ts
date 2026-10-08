import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrgStatus, PlatformAuditAction, SubscriptionStatus, UsageMetricType } from '@prisma/client';
import { EVENT_NAMES } from '@/common/constants';
import { OrgStatusService } from '@/modules/org/domain/services/org-status.service';
import { SubscriptionRepository } from '@/modules/billing/infrastructure/repositories/subscription.repository';
import { PlanRepository } from '@/modules/billing/infrastructure/repositories/plan.repository';
import { UsageRepository } from '@/modules/billing/infrastructure/repositories/usage.repository';
import { PlatformRepository } from '../../infrastructure/repositories/platform.repository';
import { AuditActor, PlatformAuditService, RequestMeta } from '../services/platform-audit.service';

/**
 * Super admin actions on a tenant org. Billing state lives in our database —
 * these never call Stripe/Razorpay; payments are handled separately.
 */

export interface AdminActionContext {
  actor: AuditActor;
  meta: RequestMeta;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** New trial end: extend from the current end, or from now if the trial already lapsed. */
export function extendedTrialEnd(currentEnd: Date | null, days: number, now = new Date()): Date {
  const base = currentEnd && currentEnd > now ? currentEnd : now;
  return new Date(base.getTime() + days * DAY_MS);
}

// ─── Suspension ───────────────────────────────────────────────────────────────

@Injectable()
export class SuspendOrgUseCase {
  private readonly logger = new Logger(SuspendOrgUseCase.name);

  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly orgStatus: OrgStatusService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(orgId: string, reason: string, ctx: AdminActionContext) {
    const org = await this.platformRepo.findOrgBasics(orgId);
    if (!org) throw new NotFoundException('Organization not found');
    if (org.status === OrgStatus.SUSPENDED) {
      throw new BadRequestException('Organization is already suspended');
    }

    const revokedSessions = await this.platformRepo.suspendOrg(orgId, reason);
    this.orgStatus.invalidate(orgId);
    // Socket gateway disconnects the org's clients
    this.eventEmitter.emit(EVENT_NAMES.ORG_SUSPENDED, { orgId, reason });

    await this.audit.record({
      action: PlatformAuditAction.ORG_SUSPENDED,
      actor: ctx.actor,
      targetType: 'Organization',
      targetId: orgId,
      orgId,
      metadata: { orgName: org.name, reason, revokedSessions },
      meta: ctx.meta,
    });

    this.logger.warn(`Org ${orgId} suspended by ${ctx.actor.email ?? ctx.actor.id}: ${reason}`);
    return { status: OrgStatus.SUSPENDED, revokedSessions };
  }
}

@Injectable()
export class ReactivateOrgUseCase {
  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly orgStatus: OrgStatusService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(orgId: string, ctx: AdminActionContext) {
    const org = await this.platformRepo.findOrgBasics(orgId);
    if (!org) throw new NotFoundException('Organization not found');
    if (org.status !== OrgStatus.SUSPENDED) {
      throw new BadRequestException('Organization is not suspended');
    }

    await this.platformRepo.reactivateOrg(orgId);
    this.orgStatus.invalidate(orgId);
    this.eventEmitter.emit(EVENT_NAMES.ORG_REACTIVATED, { orgId });

    await this.audit.record({
      action: PlatformAuditAction.ORG_REACTIVATED,
      actor: ctx.actor,
      targetType: 'Organization',
      targetId: orgId,
      orgId,
      metadata: {
        orgName: org.name,
        previousReason: org.suspendReason,
        suspendedSince: org.suspendedAt?.toISOString() ?? null,
      },
      meta: ctx.meta,
    });
    return { status: OrgStatus.ACTIVE };
  }
}

// ─── Subscription actions ─────────────────────────────────────────────────────

@Injectable()
export class AdminCancelSubscriptionUseCase {
  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: PlatformAuditService,
  ) {}

  /** Immediate cancellation. Org data is kept. */
  async execute(orgId: string, reason: string, ctx: AdminActionContext) {
    const subscription = await this.subscriptionRepo.findActiveByOrg(orgId);
    if (!subscription) throw new NotFoundException('This organization has no live subscription');

    const updated = await this.subscriptionRepo.transitionStatus(
      subscription.id,
      [
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.TRIAL,
        SubscriptionStatus.PAST_DUE,
        SubscriptionStatus.GRACE_PERIOD,
      ],
      SubscriptionStatus.CANCELLED,
      { cancelledAt: new Date(), cancelReason: reason, scheduledPlanId: null, scheduledChangeAt: null },
    );
    if (!updated) throw new BadRequestException('Subscription changed meanwhile — reload and try again');

    await this.subscriptionRepo.recordEvent({
      orgId,
      subscriptionId: subscription.id,
      previousStatus: subscription.status,
      newStatus: SubscriptionStatus.CANCELLED,
      triggeredById: ctx.actor.id,
      reason,
      metadata: { by: 'SUPER_ADMIN' },
    });

    this.eventEmitter.emit(EVENT_NAMES.SUBSCRIPTION_CANCELLED, {
      subscriptionId: subscription.id,
      orgId,
      reason,
    });

    await this.audit.record({
      action: PlatformAuditAction.SUBSCRIPTION_CANCELLED,
      actor: ctx.actor,
      targetType: 'Subscription',
      targetId: subscription.id,
      orgId,
      metadata: { reason, before: { status: subscription.status }, after: { status: SubscriptionStatus.CANCELLED } },
      meta: ctx.meta,
    });
    return { subscription: updated };
  }
}

@Injectable()
export class AdminChangePlanUseCase {
  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly planRepo: PlanRepository,
    private readonly usageRepo: UsageRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: PlatformAuditService,
  ) {}

  /**
   * Immediate switch at the new plan's price, no proration charge (DB is the
   * billing source of truth). Current-period usage counts are kept; only the
   * limits change.
   */
  async execute(orgId: string, newPlanId: string, ctx: AdminActionContext) {
    const subscription = await this.subscriptionRepo.findByOrgWithPlan(orgId);
    if (!subscription) throw new NotFoundException('This organization has no live subscription');
    if (subscription.status !== SubscriptionStatus.ACTIVE && subscription.status !== SubscriptionStatus.TRIAL) {
      throw new BadRequestException(`Can't change plan while the subscription is ${subscription.status}`);
    }
    if (subscription.planId === newPlanId) throw new BadRequestException('Already on this plan');

    const newPlan = await this.planRepo.findById(newPlanId);
    if (!newPlan || !newPlan.isActive) throw new BadRequestException('Plan not found or inactive');

    if (subscription.scheduledPlanId) {
      await this.subscriptionRepo.clearScheduledDowngrade(subscription.id);
    }

    const updated = await this.subscriptionRepo.updatePlan(subscription.id, newPlan.id, newPlan.priceInCents, {
      billingCycle: newPlan.billingCycle,
      currency: newPlan.currency,
    });
    if (!updated) throw new BadRequestException('Subscription changed meanwhile — reload and try again');

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
      orgId,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd,
      limits,
    );

    const oldPlan = subscription.plan;
    await this.subscriptionRepo.recordEvent({
      orgId,
      subscriptionId: subscription.id,
      previousStatus: subscription.status,
      newStatus: subscription.status,
      previousPlanId: oldPlan.id,
      newPlanId: newPlan.id,
      triggeredById: ctx.actor.id,
      metadata: { by: 'SUPER_ADMIN', type: 'admin_plan_change' },
    });

    const isUpgrade = newPlan.priceInCents > oldPlan.priceInCents;
    this.eventEmitter.emit(
      isUpgrade ? EVENT_NAMES.SUBSCRIPTION_UPGRADED : EVENT_NAMES.SUBSCRIPTION_DOWNGRADE_APPLIED,
      { subscriptionId: subscription.id, orgId, previousPlanId: oldPlan.id, newPlanId: newPlan.id },
    );

    await this.audit.record({
      action: PlatformAuditAction.SUBSCRIPTION_PLAN_CHANGED,
      actor: ctx.actor,
      targetType: 'Subscription',
      targetId: subscription.id,
      orgId,
      metadata: {
        before: { plan: oldPlan.name, priceInCents: subscription.priceInCents, currency: subscription.currency },
        after: { plan: newPlan.name, priceInCents: newPlan.priceInCents, currency: newPlan.currency },
      },
      meta: ctx.meta,
    });
    return { subscription: updated };
  }
}

@Injectable()
export class AdminExtendTrialUseCase {
  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(orgId: string, days: number, ctx: AdminActionContext) {
    const subscription = await this.subscriptionRepo.findActiveByOrg(orgId);
    if (!subscription || subscription.status !== SubscriptionStatus.TRIAL) {
      throw new BadRequestException('This organization is not on a trial');
    }

    const newEnd = extendedTrialEnd(subscription.trialEndsAt, days);
    // Compare-and-set on TRIAL so a concurrent expiry job can't be overwritten
    const updated = await this.subscriptionRepo.transitionStatus(
      subscription.id,
      SubscriptionStatus.TRIAL,
      SubscriptionStatus.TRIAL,
      { trialEndsAt: newEnd, currentPeriodEnd: newEnd },
    );
    if (!updated) throw new BadRequestException('Trial changed meanwhile — reload and try again');

    await this.subscriptionRepo.recordEvent({
      orgId,
      subscriptionId: subscription.id,
      previousStatus: SubscriptionStatus.TRIAL,
      newStatus: SubscriptionStatus.TRIAL,
      triggeredById: ctx.actor.id,
      reason: `Trial extended by ${days} days`,
      metadata: { by: 'SUPER_ADMIN', type: 'trial_extended', days },
    });

    await this.audit.record({
      action: PlatformAuditAction.SUBSCRIPTION_TRIAL_EXTENDED,
      actor: ctx.actor,
      targetType: 'Subscription',
      targetId: subscription.id,
      orgId,
      metadata: {
        days,
        before: { trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null },
        after: { trialEndsAt: newEnd.toISOString() },
      },
      meta: ctx.meta,
    });
    return { subscription: updated };
  }
}
