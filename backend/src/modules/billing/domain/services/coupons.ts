/**
 * Coupon rules. Pure logic, no I/O. Amounts are integer minor units (paise/cents);
 * a FIXED coupon only ever applies to a price in its own currency.
 */

export const COUPON_CODE_PATTERN = /^[A-Z0-9_-]{3,40}$/;
export const COUPON_LINE_PREFIX = 'Coupon';

export type CouponKindName = 'PERCENT' | 'FIXED';

export interface CouponTerms {
  code: string;
  kind: CouponKindName;
  percentOff: number | null;
  amountOffInCents: number | null;
  currency: string | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  validFrom: Date | null;
  validUntil: Date | null;
  appliesToPlanIds: string[];
  firstPaymentOnly: boolean;
  active: boolean;
}

export interface CouponDefinition {
  code: string;
  kind: CouponKindName;
  percentOff?: number | null;
  amountOffInCents?: number | null;
  currency?: string | null;
  maxRedemptions?: number | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  firstPaymentOnly?: boolean;
}

export type CouponResult =
  | { ok: true; discountInCents: number; finalAmountInCents: number }
  | { ok: false; reason: string };

/** Trim + uppercase; validity is checked separately. */
export function normalizeCouponCode(code: string): string {
  return (code ?? '').trim().toUpperCase();
}

/** Checks a new coupon's terms; returns the first problem found. */
export function checkCouponDefinition(def: CouponDefinition): { ok: true } | { ok: false; reason: string } {
  if (!COUPON_CODE_PATTERN.test(def.code)) {
    return { ok: false, reason: 'Code must be 3-40 characters: A-Z, 0-9, _ or -' };
  }
  if (def.kind === 'PERCENT') {
    const p = def.percentOff;
    if (p == null || !Number.isInteger(p) || p < 1 || p > 100) {
      return { ok: false, reason: 'Percent off must be a whole number from 1 to 100' };
    }
    if (def.amountOffInCents != null) return { ok: false, reason: 'A percent coupon cannot also have a fixed amount' };
  } else if (def.kind === 'FIXED') {
    const a = def.amountOffInCents;
    if (a == null || !Number.isSafeInteger(a) || a <= 0) {
      return { ok: false, reason: 'Amount off must be a positive amount' };
    }
    if (!def.currency || !/^[A-Z]{3}$/.test(def.currency)) {
      return { ok: false, reason: 'A fixed-amount coupon needs a 3-letter currency' };
    }
    if (def.percentOff != null) return { ok: false, reason: 'A fixed coupon cannot also have a percent off' };
  } else {
    return { ok: false, reason: 'Unknown coupon kind' };
  }
  if (def.maxRedemptions != null && (!Number.isInteger(def.maxRedemptions) || def.maxRedemptions < 1)) {
    return { ok: false, reason: 'Max redemptions must be at least 1' };
  }
  if (def.validFrom && def.validUntil && def.validUntil.getTime() <= def.validFrom.getTime()) {
    return { ok: false, reason: 'Valid until must be after valid from' };
  }
  if (def.firstPaymentOnly === false) {
    return {
      ok: false,
      reason: 'Recurring coupons are not supported yet: coupons apply to the first payment only',
    };
  }
  return { ok: true };
}

/** Discount for a price: never more than the price, never below 0. */
export function couponDiscount(
  terms: Pick<CouponTerms, 'kind' | 'percentOff' | 'amountOffInCents'>,
  priceInCents: number,
): number {
  const price = Math.max(Math.trunc(priceInCents), 0);
  const raw =
    terms.kind === 'PERCENT'
      ? Math.floor((price * (terms.percentOff ?? 0)) / 100)
      : (terms.amountOffInCents ?? 0);
  return Math.min(Math.max(raw, 0), price);
}

/**
 * Can this coupon be used for (planId, currency, price) at `now`? Returns the discount
 * and what is left to pay. Per-org reuse is checked by the caller (needs the DB).
 */
export function evaluateCoupon(
  coupon: CouponTerms,
  ctx: { planId: string; currency: string; priceInCents: number; now: Date },
): CouponResult {
  if (!coupon.active) return { ok: false, reason: 'This coupon is no longer active' };
  if (coupon.validFrom && ctx.now.getTime() < coupon.validFrom.getTime()) {
    return { ok: false, reason: 'This coupon is not valid yet' };
  }
  if (coupon.validUntil && ctx.now.getTime() > coupon.validUntil.getTime()) {
    return { ok: false, reason: 'This coupon has expired' };
  }
  if (coupon.maxRedemptions != null && coupon.redemptionCount >= coupon.maxRedemptions) {
    return { ok: false, reason: 'This coupon has reached its redemption limit' };
  }
  if (coupon.appliesToPlanIds.length > 0 && !coupon.appliesToPlanIds.includes(ctx.planId)) {
    return { ok: false, reason: 'This coupon does not apply to the selected plan' };
  }
  if (ctx.priceInCents <= 0) return { ok: false, reason: 'Coupons do not apply to free plans' };
  if (coupon.kind === 'FIXED' && coupon.currency !== ctx.currency) {
    return { ok: false, reason: `This coupon is only valid for ${coupon.currency} prices` };
  }
  const discountInCents = couponDiscount(coupon, ctx.priceInCents);
  if (discountInCents <= 0) return { ok: false, reason: 'This coupon gives no discount on the selected plan' };
  return { ok: true, discountInCents, finalAmountInCents: ctx.priceInCents - discountInCents };
}

/** Negative invoice line for a redeemed coupon. */
export function couponLine(code: string, discountInCents: number) {
  return { description: `${COUPON_LINE_PREFIX} ${code}`, amount: -discountInCents, quantity: 1 };
}
