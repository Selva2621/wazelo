import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { UsageMetricType } from '@prisma/client';
import { PlatformSettingsService } from '@/modules/platform-settings/domain/services/platform-settings.service';
import { AiCreditRepository } from '../../infrastructure/repositories/ai-credit.repository';
import { SubscriptionRepository } from '../../infrastructure/repositories/subscription.repository';
import { UsageTrackingService } from './usage-tracking.service';
import { AiAction, costOf } from './ai-actions';

export interface AiCreditWallet {
  plan: {
    used: number;
    /** 0 when unlimited */
    limit: number;
    unlimited: boolean;
    remaining: number | null;
    resetsAt: Date | null;
  };
  /** Bought credits left; they never expire */
  purchased: number;
  /** Plan remaining + purchased; null when the plan is unlimited */
  available: number | null;
}

/**
 * AI credit metering. Each AI action costs a fixed number of credits (set by the
 * super admin). A charge is paid from the month's plan credits first, then from
 * purchased credits; with neither left the action is refused (AI_CREDITS_EXHAUSTED).
 */
@Injectable()
export class AiCreditsService {
  private readonly logger = new Logger(AiCreditsService.name);

  constructor(
    private readonly usageTracking: UsageTrackingService,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly repo: AiCreditRepository,
    private readonly settings: PlatformSettingsService,
  ) {}

  async costOf(action: AiAction): Promise<number> {
    return costOf(action, (await this.settings.get()).ai.actionCosts);
  }

  async getWallet(orgId: string): Promise<AiCreditWallet> {
    const [usage, purchased, subscription] = await Promise.all([
      this.usageTracking.checkUsage(orgId, UsageMetricType.AI_CREDITS),
      this.repo.getBalance(orgId),
      this.subscriptionRepo.findByOrgWithPlan(orgId),
    ]);
    // No subscription: checkUsage reports limit 0 but allowed=false — that's "none", not "unlimited"
    const unlimited = !!subscription && usage.limitValue === 0;
    const remaining = unlimited ? null : Math.max(0, usage.limitValue - usage.currentValue);
    return {
      plan: {
        used: usage.currentValue,
        limit: usage.limitValue,
        unlimited,
        remaining,
        resetsAt: subscription?.currentPeriodEnd ?? null,
      },
      purchased,
      available: remaining === null ? null : remaining + purchased,
    };
  }

  /**
   * Whether the org may run `action` now: AI is on for it (kill switch, super admin
   * override, plan) and it has the credits.
   */
  async canAfford(orgId: string, action: AiAction): Promise<boolean> {
    if (!(await this.usageTracking.isFeatureEnabled(orgId, 'ai'))) return false;
    const cost = await this.costOf(action);
    if (cost === 0) return true;
    const wallet = await this.getWallet(orgId);
    return wallet.available === null || wallet.available >= cost;
  }

  /** 403 FEATURE_NOT_AVAILABLE without AI on the plan, AI_CREDITS_EXHAUSTED without the credits. */
  async assertCanAfford(orgId: string, action: AiAction): Promise<void> {
    if (!(await this.usageTracking.isFeatureEnabled(orgId, 'ai'))) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'FEATURE_NOT_AVAILABLE',
        message: 'AI is not included in your current plan. Please upgrade to use AI features.',
        details: { feature: 'ai', orgId },
      });
    }
    const cost = await this.costOf(action);
    if (cost === 0) return;
    const wallet = await this.getWallet(orgId);
    if (wallet.available === null || wallet.available >= cost) return;
    throw new ForbiddenException({
      statusCode: 403,
      error: 'AI_CREDITS_EXHAUSTED',
      message: 'You have used all your AI credits. Buy more credits to keep using AI.',
      details: { action, cost, available: wallet.available },
    });
  }

  /**
   * Charges a finished AI action. Never throws: the AI work is already done, so a
   * metering failure is logged rather than failing the caller.
   */
  async charge(orgId: string, action: AiAction): Promise<void> {
    try {
      const cost = await this.costOf(action);
      // Free action: nothing to take, no ledger row
      if (cost <= 0) return;
      // Plan credits first, then purchased. Each take is one locked statement, so
      // concurrent charges (e.g. the 4 AI calls when a chat opens) can't overdraw either.
      const fromPlan = await this.usageTracking.consumeUpTo(orgId, UsageMetricType.AI_CREDITS, cost);
      const fromPurchased = await this.repo.takePurchased(orgId, cost - fromPlan);

      await this.repo.recordUsage({ orgId, action, planCredits: fromPlan, purchasedCredits: fromPurchased });
    } catch (err) {
      this.logger.error(`AI credit charge failed (org ${orgId}, ${action}): ${(err as Error).message}`);
    }
  }
}
