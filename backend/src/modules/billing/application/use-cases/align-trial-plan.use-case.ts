import { Injectable, Logger } from '@nestjs/common';
import { BillingCycle, OrgType, SubscriptionStatus, UsageMetricType } from '@prisma/client';
import { isTrialPlanSlug, trialPlanSlugFor } from '@/shared/constants/trial-plans';
import { PlanRepository } from '../../infrastructure/repositories/plan.repository';
import { SubscriptionRepository } from '../../infrastructure/repositories/subscription.repository';
import { UsageRepository } from '../../infrastructure/repositories/usage.repository';

/**
 * Keeps a running free trial on the right trial plan for the org type: the
 * freelancer trial for freelancers, the team trial for everyone else. Orgs pick
 * their type after signup, when the trial has already started, so this moves the
 * trial across (same end date). Paid plans are never touched.
 */
@Injectable()
export class AlignTrialPlanUseCase {
  private readonly logger = new Logger(AlignTrialPlanUseCase.name);

  constructor(
    private readonly planRepo: PlanRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly usageRepo: UsageRepository,
  ) {}

  async execute(orgId: string, orgType: OrgType | string): Promise<void> {
    const subscription = await this.subscriptionRepo.findByOrgWithPlan(orgId);
    if (!subscription || subscription.status !== SubscriptionStatus.TRIAL) return;
    if (!isTrialPlanSlug(subscription.plan?.slug)) return;

    const target = await this.planRepo.findActiveBySlugAndCycle(trialPlanSlugFor(orgType), BillingCycle.MONTHLY);
    if (!target || target.id === subscription.planId) return;

    const updated = await this.subscriptionRepo.updatePlan(subscription.id, target.id, target.priceInCents);
    if (!updated) return;

    await this.usageRepo.resetUsageForOrg(orgId, subscription.currentPeriodStart, subscription.currentPeriodEnd, {
      [UsageMetricType.MESSAGES_SENT]: target.maxMessagesPerMonth,
      [UsageMetricType.ACTIVE_USERS]: target.maxUsers,
      [UsageMetricType.WHATSAPP_SESSIONS]: target.maxWhatsappSessions,
      [UsageMetricType.CAMPAIGN_EXECUTIONS]: target.maxCampaignsPerMonth,
      [UsageMetricType.API_CALLS]: target.maxApiCallsPerMonth,
      [UsageMetricType.AI_CREDITS]: target.aiCreditsPerMonth,
      [UsageMetricType.MESSAGE_TEMPLATES]: target.maxMessageTemplates,
    });

    await this.subscriptionRepo.recordEvent({
      orgId,
      subscriptionId: subscription.id,
      previousStatus: SubscriptionStatus.TRIAL,
      newStatus: SubscriptionStatus.TRIAL,
      previousPlanId: subscription.planId,
      newPlanId: target.id,
      reason: `Trial moved to ${target.slug} for org type ${orgType}`,
      metadata: { type: 'trial_plan_aligned' },
    });

    this.logger.log(`Org ${orgId} trial moved from ${subscription.plan.slug} to ${target.slug}`);
  }
}
