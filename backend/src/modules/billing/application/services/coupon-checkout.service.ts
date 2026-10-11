import { ConflictException, Injectable } from '@nestjs/common';
import { Coupon, Prisma } from '@prisma/client';
import {
  CouponRedemptionError,
  CouponRepository,
  RedeemCouponInput,
} from '../../infrastructure/repositories/coupon.repository';
import { evaluateCoupon, normalizeCouponCode } from '../../domain/services/coupons';

export interface CouponPlan {
  id: string;
  priceInCents: number;
  currency: string;
}

export type CouponQuote =
  | { ok: true; coupon: Coupon; code: string; discountInCents: number; finalAmountInCents: number }
  | { ok: false; message: string };

/** A coupon already priced into a checkout (e.g. carried in a gateway order's notes). */
export interface CheckoutCoupon {
  couponId: string;
  code: string;
  discountInCents: number;
}

/**
 * Coupon pricing + redemption for tenant checkout. Quotes are advisory; the binding check
 * is `redeem`, which runs inside the caller's subscribe transaction.
 */
@Injectable()
export class CouponCheckoutService {
  constructor(private readonly couponRepo: CouponRepository) {}

  async quote(orgId: string, rawCode: string, plan: CouponPlan, now = new Date()): Promise<CouponQuote> {
    const code = normalizeCouponCode(rawCode);
    const coupon = code ? await this.couponRepo.findByCode(code) : null;
    if (!coupon) return { ok: false, message: 'Coupon not found' };

    const result = evaluateCoupon(coupon, {
      planId: plan.id,
      currency: plan.currency,
      priceInCents: plan.priceInCents,
      now,
    });
    if (!result.ok) return { ok: false, message: result.reason };
    if (await this.couponRepo.hasRedeemed(coupon.id, orgId)) {
      return { ok: false, message: 'Your organization has already used this coupon' };
    }
    return {
      ok: true,
      coupon,
      code,
      discountInCents: result.discountInCents,
      finalAmountInCents: result.finalAmountInCents,
    };
  }

  /** Atomic claim + record inside `tx`; a lost race surfaces as a 409 and rolls `tx` back. */
  async redeem(tx: Prisma.TransactionClient, input: RedeemCouponInput) {
    try {
      return await this.couponRepo.redeem(tx, input);
    } catch (err) {
      if (err instanceof CouponRedemptionError) throw new ConflictException(err.message);
      throw err;
    }
  }
}
