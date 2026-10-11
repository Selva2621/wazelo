import { Injectable } from '@nestjs/common';
import { PlanRepository } from '../../infrastructure/repositories/plan.repository';
import { CouponCheckoutService } from '../services/coupon-checkout.service';

export interface CouponValidation {
  valid: boolean;
  discountInCents: number;
  finalAmountInCents: number;
  currency: string;
  message: string;
}

/** Tenant checkout preview: would this coupon apply to this plan for this org right now? */
@Injectable()
export class ValidateCouponUseCase {
  constructor(
    private readonly planRepo: PlanRepository,
    private readonly couponCheckout: CouponCheckoutService,
  ) {}

  async execute(orgId: string, code: string, planId: string): Promise<CouponValidation> {
    const plan = await this.planRepo.findById(planId);
    if (!plan || plan.deletedAt) {
      return { valid: false, discountInCents: 0, finalAmountInCents: 0, currency: '', message: 'Plan not found' };
    }
    const quote = await this.couponCheckout.quote(orgId, code, plan);
    if (!quote.ok) {
      return {
        valid: false,
        discountInCents: 0,
        finalAmountInCents: plan.priceInCents,
        currency: plan.currency,
        message: quote.message,
      };
    }
    return {
      valid: true,
      discountInCents: quote.discountInCents,
      finalAmountInCents: quote.finalAmountInCents,
      currency: plan.currency,
      message: 'Coupon applied to your first payment',
    };
  }
}
