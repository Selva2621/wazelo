import {
  checkCouponDefinition,
  couponDiscount,
  couponLine,
  CouponTerms,
  evaluateCoupon,
  normalizeCouponCode,
} from './coupons';

const now = new Date('2026-10-11T12:00:00Z');

function coupon(over: Partial<CouponTerms> = {}): CouponTerms {
  return {
    code: 'WELCOME20',
    kind: 'PERCENT',
    percentOff: 20,
    amountOffInCents: null,
    currency: null,
    maxRedemptions: null,
    redemptionCount: 0,
    validFrom: null,
    validUntil: null,
    appliesToPlanIds: [],
    firstPaymentOnly: true,
    active: true,
    ...over,
  };
}

const ctx = { planId: 'plan-pro', currency: 'INR', priceInCents: 99900, now };

describe('couponDiscount', () => {
  it('takes a percentage, rounding down to whole minor units', () => {
    expect(couponDiscount({ kind: 'PERCENT', percentOff: 15, amountOffInCents: null }, 999)).toBe(149);
  });

  it('100% off equals the price', () => {
    expect(couponDiscount({ kind: 'PERCENT', percentOff: 100, amountOffInCents: null }, 99900)).toBe(99900);
  });

  it('caps a fixed discount at the price (never below 0)', () => {
    expect(couponDiscount({ kind: 'FIXED', percentOff: null, amountOffInCents: 50000 }, 30000)).toBe(30000);
  });

  it('is 0 for a zero price', () => {
    expect(couponDiscount({ kind: 'FIXED', percentOff: null, amountOffInCents: 500 }, 0)).toBe(0);
  });
});

describe('evaluateCoupon', () => {
  it('prices a valid percent coupon', () => {
    expect(evaluateCoupon(coupon(), ctx)).toEqual({ ok: true, discountInCents: 19980, finalAmountInCents: 79920 });
  });

  it('prices a fixed coupon in the matching currency', () => {
    const c = coupon({ kind: 'FIXED', percentOff: null, amountOffInCents: 10000, currency: 'INR' });
    expect(evaluateCoupon(c, ctx)).toEqual({ ok: true, discountInCents: 10000, finalAmountInCents: 89900 });
  });

  it('refuses a fixed coupon in another currency', () => {
    const c = coupon({ kind: 'FIXED', percentOff: null, amountOffInCents: 1000, currency: 'USD' });
    const r = evaluateCoupon(c, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('USD');
  });

  it('a fixed coupon larger than the price makes it free, not negative', () => {
    const c = coupon({ kind: 'FIXED', percentOff: null, amountOffInCents: 500000, currency: 'INR' });
    expect(evaluateCoupon(c, ctx)).toEqual({ ok: true, discountInCents: 99900, finalAmountInCents: 0 });
  });

  it('refuses inactive coupons', () => {
    expect(evaluateCoupon(coupon({ active: false }), ctx).ok).toBe(false);
  });

  it('refuses before validFrom and after validUntil', () => {
    expect(evaluateCoupon(coupon({ validFrom: new Date('2026-10-12T00:00:00Z') }), ctx).ok).toBe(false);
    expect(evaluateCoupon(coupon({ validUntil: new Date('2026-10-11T11:59:59Z') }), ctx).ok).toBe(false);
  });

  it('accepts inside the validity window', () => {
    const c = coupon({ validFrom: new Date('2026-10-01T00:00:00Z'), validUntil: new Date('2026-10-31T00:00:00Z') });
    expect(evaluateCoupon(c, ctx).ok).toBe(true);
  });

  it('refuses when the redemption limit is reached', () => {
    expect(evaluateCoupon(coupon({ maxRedemptions: 5, redemptionCount: 5 }), ctx).ok).toBe(false);
    expect(evaluateCoupon(coupon({ maxRedemptions: 5, redemptionCount: 4 }), ctx).ok).toBe(true);
  });

  it('honours the plan allow-list (empty = all plans)', () => {
    expect(evaluateCoupon(coupon({ appliesToPlanIds: ['plan-basic'] }), ctx).ok).toBe(false);
    expect(evaluateCoupon(coupon({ appliesToPlanIds: ['plan-basic', 'plan-pro'] }), ctx).ok).toBe(true);
  });

  it('does not apply to free plans', () => {
    expect(evaluateCoupon(coupon(), { ...ctx, priceInCents: 0 }).ok).toBe(false);
  });
});

describe('checkCouponDefinition', () => {
  const ok = { code: 'SAVE10', kind: 'PERCENT' as const, percentOff: 10 };

  it('accepts a valid percent coupon', () => {
    expect(checkCouponDefinition(ok)).toEqual({ ok: true });
  });

  it('accepts a valid fixed coupon', () => {
    expect(checkCouponDefinition({ code: 'FLAT500', kind: 'FIXED', amountOffInCents: 50000, currency: 'INR' })).toEqual({ ok: true });
  });

  it.each(['ab', 'lower', 'HAS SPACE', 'A'.repeat(41), 'BAD!'])('rejects code %p', (code) => {
    expect(checkCouponDefinition({ ...ok, code }).ok).toBe(false);
  });

  it.each([0, 101, 12.5, null])('rejects percentOff %p', (percentOff) => {
    expect(checkCouponDefinition({ ...ok, percentOff }).ok).toBe(false);
  });

  it('requires a currency for FIXED', () => {
    expect(checkCouponDefinition({ code: 'FLAT', kind: 'FIXED', amountOffInCents: 100 }).ok).toBe(false);
  });

  it('rejects mixing percent and fixed fields', () => {
    expect(checkCouponDefinition({ ...ok, amountOffInCents: 100 }).ok).toBe(false);
  });

  it('rejects an empty validity window', () => {
    const d = new Date('2026-10-11T00:00:00Z');
    expect(checkCouponDefinition({ ...ok, validFrom: d, validUntil: d }).ok).toBe(false);
  });

  it('rejects maxRedemptions below 1', () => {
    expect(checkCouponDefinition({ ...ok, maxRedemptions: 0 }).ok).toBe(false);
  });

  it('rejects recurring (firstPaymentOnly=false) coupons with a clear message', () => {
    const r = checkCouponDefinition({ ...ok, firstPaymentOnly: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/first payment only/);
  });
});

describe('helpers', () => {
  it('normalizes codes to trimmed uppercase', () => {
    expect(normalizeCouponCode('  welcome20 ')).toBe('WELCOME20');
  });

  it('builds a negative coupon line', () => {
    expect(couponLine('WELCOME20', 19980)).toEqual({ description: 'Coupon WELCOME20', amount: -19980, quantity: 1 });
  });
});
