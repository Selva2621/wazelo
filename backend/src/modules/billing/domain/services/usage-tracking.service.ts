import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsageMetricType } from '@prisma/client';
import { UsageRepository } from '../../infrastructure/repositories/usage.repository';
import { SubscriptionRepository } from '../../infrastructure/repositories/subscription.repository';
import { EVENT_NAMES } from '@/common/constants';

export interface UsageCheckResult {
  allowed: boolean;
  currentValue: number;
  limitValue: number;
  percentUsed: number;
  softLimitReached: boolean;
  hardLimitReached: boolean;
}

@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  constructor(
    private readonly usageRepo: UsageRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Check if an action is allowed under the org's current usage limits.
   * Does NOT increment — call incrementUsage separately after the action succeeds.
   */
  async checkUsage(
    orgId: string,
    metricType: UsageMetricType,
  ): Promise<UsageCheckResult> {
    const subscription = await this.subscriptionRepo.findByOrgWithPlan(orgId);

    if (!subscription) {
      // No active subscription — block everything
      return {
        allowed: false,
        currentValue: 0,
        limitValue: 0,
        percentUsed: 100,
        softLimitReached: true,
        hardLimitReached: true,
      };
    }

    const plan = subscription.plan;
    const limitValue = this.getLimitForMetric(plan, metricType);

    // For count-based metrics (users, sessions), check live counts
    if (metricType === UsageMetricType.ACTIVE_USERS) {
      const currentValue = await this.usageRepo.getActiveUserCount(orgId);
      return this.buildResult(orgId, metricType, currentValue, limitValue, plan.softLimitPercent);
    }

    if (metricType === UsageMetricType.WHATSAPP_SESSIONS) {
      const currentValue = await this.usageRepo.getActiveSessionCount(orgId);
      return this.buildResult(orgId, metricType, currentValue, limitValue, plan.softLimitPercent);
    }

    if (metricType === UsageMetricType.MESSAGE_TEMPLATES) {
      const currentValue = await this.usageRepo.getTemplateCount(orgId);
      return this.buildResult(orgId, metricType, currentValue, limitValue, plan.softLimitPercent);
    }

    // For period-based metrics (messages, campaigns, api calls, ai credits), check usage records
    const usage = await this.usageRepo.getUsage(
      orgId,
      metricType,
      subscription.currentPeriodStart,
    );

    const currentValue = usage?.currentValue ?? 0;
    return this.buildResult(orgId, metricType, currentValue, limitValue, plan.softLimitPercent);
  }

  /**
   * Increment a usage counter after an action succeeds.
   * Emits soft/hard limit events as needed.
   */
  async incrementUsage(
    orgId: string,
    metricType: UsageMetricType,
    amount: number = 1,
  ): Promise<UsageRecord | null> {
    const subscription = await this.subscriptionRepo.findByOrgWithPlan(orgId);
    if (!subscription) return null;

    const plan = subscription.plan;
    const limitValue = this.getLimitForMetric(plan, metricType);

    // Ensure usage record exists for current period
    await this.usageRepo.findOrCreate(
      orgId,
      metricType,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd,
      limitValue,
    );

    const updated = await this.usageRepo.incrementUsage(
      orgId,
      metricType,
      subscription.currentPeriodStart,
      amount,
    );

    // Check if soft limit was just crossed
    const percentUsed = limitValue > 0
      ? Math.round((updated.currentValue / limitValue) * 100)
      : 100;

    const softThreshold = plan.softLimitPercent;
    const previousPercent = limitValue > 0
      ? Math.round(((updated.currentValue - amount) / limitValue) * 100)
      : 100;

    if (previousPercent < softThreshold && percentUsed >= softThreshold) {
      this.eventEmitter.emit(EVENT_NAMES.USAGE_SOFT_LIMIT_WARNING, {
        orgId,
        metricType,
        currentValue: updated.currentValue,
        limitValue,
        percentUsed,
      });
    }

    if (updated.currentValue >= limitValue && (updated.currentValue - amount) < limitValue) {
      this.eventEmitter.emit(EVENT_NAMES.USAGE_LIMIT_REACHED, {
        orgId,
        metricType,
        currentValue: updated.currentValue,
        limitValue,
      });
    }

    return updated;
  }

  /**
   * Check if a feature is enabled for the org's current plan.
   */
  async isFeatureEnabled(orgId: string, feature: 'campaigns' | 'automation' | 'api' | 'ai' | 'shopify'): Promise<boolean> {
    const subscription = await this.subscriptionRepo.findByOrgWithPlan(orgId);
    if (!subscription) return false;

    const plan = subscription.plan;
    if (feature === 'campaigns') return plan.campaignsEnabled;
    if (feature === 'automation') return plan.automationEnabled;
    if (feature === 'api') return (plan as any).apiEnabled ?? false;
    if (feature === 'ai') return (plan as any).aiEnabled ?? false;
    if (feature === 'shopify') return (plan as any).shopifyEnabled ?? false;
    return false;
  }

  private getLimitForMetric(plan: any, metricType: UsageMetricType): number {
    switch (metricType) {
      case UsageMetricType.MESSAGES_SENT:
        return plan.maxMessagesPerMonth;
      case UsageMetricType.ACTIVE_USERS:
        return plan.maxUsers;
      case UsageMetricType.WHATSAPP_SESSIONS:
        return plan.maxWhatsappSessions;
      case UsageMetricType.CAMPAIGN_EXECUTIONS:
        return plan.maxCampaignsPerMonth;
      case UsageMetricType.API_CALLS:
        return plan.maxApiCallsPerMonth ?? 0;
      case UsageMetricType.AI_CREDITS:
        return plan.aiCreditsPerMonth ?? 0;
      case UsageMetricType.MESSAGE_TEMPLATES:
        return plan.maxMessageTemplates ?? 0;
      default:
        return 0;
    }
  }

  private buildResult(
    orgId: string,
    metricType: UsageMetricType,
    currentValue: number,
    limitValue: number,
    softLimitPercent: number,
  ): UsageCheckResult {
    // limitValue of 0 means unlimited for that metric
    if (limitValue === 0) {
      return {
        allowed: true,
        currentValue,
        limitValue: 0,
        percentUsed: 0,
        softLimitReached: false,
        hardLimitReached: false,
      };
    }

    const percentUsed = Math.round((currentValue / limitValue) * 100);
    const softLimitReached = percentUsed >= softLimitPercent;
    const hardLimitReached = currentValue >= limitValue;

    return {
      allowed: !hardLimitReached,
      currentValue,
      limitValue,
      percentUsed,
      softLimitReached,
      hardLimitReached,
    };
  }
}

// Re-export for type reference
import { UsageRecord } from '@prisma/client';
