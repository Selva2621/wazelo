import { Injectable } from '@nestjs/common';
import { Plan } from '@prisma/client';
import { PlanRepository } from '../../infrastructure/repositories/plan.repository';
import { SubscriptionRepository } from '../../infrastructure/repositories/subscription.repository';
import { OrgLocaleService } from '@/modules/org/domain/services/org-locale.service';
import { billingCurrencyFor } from '@/shared/constants/billing-currencies';

@Injectable()
export class ListPlansUseCase {
  constructor(
    private readonly planRepo: PlanRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly orgLocale: OrgLocaleService,
  ) {}

  /** Tenants see active plans only; the super admin also sees inactive ones to reactivate them. */
  async execute(options: { includeInactive?: boolean; orgId?: string } = {}) {
    const plans = options.includeInactive
      ? await this.planRepo.findAllForAdmin()
      : await this.planRepo.findAllActive();
    if (!options.orgId) return { plans };

    const currency = await this.billingCurrency(options.orgId);
    return { plans: plansIn(plans, currency), currency };
  }

  /** A paying org stays in the currency it pays in; otherwise INR for India, USD elsewhere */
  private async billingCurrency(orgId: string): Promise<string> {
    const subscription = await this.subscriptionRepo.findActiveByOrg(orgId);
    if (subscription && subscription.priceInCents > 0) return subscription.currency.toUpperCase();
    return billingCurrencyFor((await this.orgLocale.get(orgId)).country);
  }
}

/**
 * The plans priced in `currency`. Free plans in another currency stay when the
 * currency has none of its own; with no plans at all in it yet, everything is shown
 * so the org can still subscribe.
 */
export function plansIn(plans: Plan[], currency: string): Plan[] {
  const matching = plans.filter((p) => p.currency.toUpperCase() === currency);
  if (matching.length === 0) return plans;
  const hasOwnFree = matching.some((p) => p.priceInCents === 0);
  return plans.filter(
    (p) => p.currency.toUpperCase() === currency || (!hasOwnFree && p.priceInCents === 0),
  );
}
