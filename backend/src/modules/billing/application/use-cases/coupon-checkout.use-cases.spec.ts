import { BadRequestException, ConflictException } from '@nestjs/common';
import { CouponCheckoutService } from '../services/coupon-checkout.service';
import { CouponRedemptionError } from '../../infrastructure/repositories/coupon.repository';
import { ValidateCouponUseCase } from './validate-coupon.use-case';
import { CreateCheckoutOrderUseCase, ResolveCheckoutOrderUseCase } from './checkout-order.use-cases';

const plan = {
  id: 'plan-pro', name: 'Pro', priceInCents: 100000, currency: 'INR', isActive: true,
  deletedAt: null, archivedAt: null, billingCycle: 'MONTHLY', trialDays: 0,
};

function couponRow(over: Record<string, unknown> = {}) {
  return {
    id: 'cp-1', code: 'SAVE20', kind: 'PERCENT', percentOff: 20, amountOffInCents: null, currency: null,
    maxRedemptions: null, redemptionCount: 0, validFrom: null, validUntil: null, appliesToPlanIds: [],
    firstPaymentOnly: true, active: true, ...over,
  };
}

function couponRepo(row: any = couponRow(), redeemed = false) {
  return {
    findByCode: jest.fn(async (code: string) => (row && row.code === code ? row : null)),
    hasRedeemed: jest.fn(async () => redeemed),
    redeem: jest.fn(async () => ({ id: 'red-1' })),
  };
}

describe('CouponCheckoutService', () => {
  it('quotes a valid coupon (case-insensitive code)', async () => {
    const svc = new CouponCheckoutService(couponRepo() as any);
    const q = await svc.quote('org-1', ' save20 ', plan);
    expect(q).toMatchObject({ ok: true, code: 'SAVE20', discountInCents: 20000, finalAmountInCents: 80000 });
  });

  it('refuses unknown codes and coupons the org already used', async () => {
    expect(await new CouponCheckoutService(couponRepo() as any).quote('org-1', 'NOPE', plan)).toEqual({ ok: false, message: 'Coupon not found' });
    const used = await new CouponCheckoutService(couponRepo(couponRow(), true) as any).quote('org-1', 'SAVE20', plan);
    expect(used.ok).toBe(false);
  });

  it('maps a lost redemption race to 409', async () => {
    const repo = couponRepo();
    repo.redeem.mockRejectedValueOnce(new CouponRedemptionError('exhausted'));
    await expect(
      new CouponCheckoutService(repo as any).redeem({} as any, { couponId: 'cp-1', orgId: 'org-1', discountInCents: 1, currency: 'INR' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('ValidateCouponUseCase', () => {
  it('returns the discount and final amount', async () => {
    const uc = new ValidateCouponUseCase({ findById: jest.fn(async () => plan) } as any, new CouponCheckoutService(couponRepo() as any));
    expect(await uc.execute('org-1', 'SAVE20', 'plan-pro')).toEqual({
      valid: true, discountInCents: 20000, finalAmountInCents: 80000, currency: 'INR', message: expect.any(String),
    });
  });

  it('explains why a coupon is invalid', async () => {
    const uc = new ValidateCouponUseCase(
      { findById: jest.fn(async () => plan) } as any,
      new CouponCheckoutService(couponRepo(couponRow({ active: false })) as any),
    );
    expect(await uc.execute('org-1', 'SAVE20', 'plan-pro')).toMatchObject({ valid: false, discountInCents: 0, finalAmountInCents: 100000 });
  });
});

describe('CreateCheckoutOrderUseCase', () => {
  function build(opts: { live?: any; row?: any } = {}) {
    const razorpay = { createOrder: jest.fn(async (amount: number, currency: string, _receipt?: string, _notes?: Record<string, string>) => ({ orderId: 'order_1', amount, currency })) };
    const uc = new CreateCheckoutOrderUseCase(
      { findById: jest.fn(async () => plan) } as any,
      { findActiveByOrg: jest.fn(async () => opts.live ?? null) } as any,
      razorpay as any,
      new CouponCheckoutService(couponRepo(opts.row ?? couponRow()) as any),
    );
    return { uc, razorpay };
  }

  it('prices the order at the discounted amount and puts the coupon in the notes', async () => {
    const { uc, razorpay } = build();
    const out = await uc.execute('org-1', { planId: 'plan-pro', couponCode: 'save20' });
    expect(out).toMatchObject({ amount: 80000, originalAmount: 100000, discountInCents: 20000 });
    expect(razorpay.createOrder.mock.calls[0][3]).toMatchObject({ couponId: 'cp-1', couponCode: 'SAVE20', discountInCents: '20000' });
  });

  it('charges the full price without a coupon', async () => {
    const { uc } = build();
    expect(await uc.execute('org-1', { planId: 'plan-pro' })).toMatchObject({ amount: 100000, discountInCents: 0 });
  });

  it('rejects coupons on renewals / plan changes (first payment only)', async () => {
    const { uc } = build({ live: { status: 'ACTIVE', planId: 'plan-pro' } });
    await expect(uc.execute('org-1', { planId: 'plan-pro', couponCode: 'SAVE20' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows a coupon when a trial converts to paid', async () => {
    const { uc } = build({ live: { status: 'TRIAL', planId: 'plan-pro' } });
    expect(await uc.execute('org-1', { planId: 'plan-pro', couponCode: 'SAVE20' })).toMatchObject({ amount: 80000 });
  });

  it('refuses a gateway order for a 100%-off coupon', async () => {
    const { uc, razorpay } = build({ row: couponRow({ percentOff: 100 }) });
    await expect(uc.execute('org-1', { planId: 'plan-pro', couponCode: 'SAVE20' })).rejects.toBeInstanceOf(BadRequestException);
    expect(razorpay.createOrder).not.toHaveBeenCalled();
  });
});

describe('ResolveCheckoutOrderUseCase', () => {
  function build(order: any) {
    return new ResolveCheckoutOrderUseCase(
      { findById: jest.fn(async () => plan) } as any,
      { fetchOrder: jest.fn(async () => order) } as any,
    );
  }

  it('returns the coupon priced into the order', async () => {
    const uc = build({ amount: 80000, currency: 'INR', notes: { orgId: 'org-1', planId: 'plan-pro', couponId: 'cp-1', couponCode: 'SAVE20', discountInCents: '20000' } });
    expect(await uc.execute('org-1', 'order_1', 'plan-pro')).toEqual({ coupon: { couponId: 'cp-1', code: 'SAVE20', discountInCents: 20000 } });
  });

  it('returns no coupon for a full-price order', async () => {
    const uc = build({ amount: 100000, currency: 'INR', notes: { orgId: 'org-1', planId: 'plan-pro' } });
    expect(await uc.execute('org-1', 'order_1', 'plan-pro')).toEqual({ coupon: null });
  });

  it('rejects an order for another org or plan, or with a mismatched amount', async () => {
    await expect(build({ amount: 100000, currency: 'INR', notes: { orgId: 'org-2', planId: 'plan-pro' } }).execute('org-1', 'o', 'plan-pro'))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(build({ amount: 100000, currency: 'INR', notes: { orgId: 'org-1', planId: 'plan-x' } }).execute('org-1', 'o', 'plan-pro'))
      .rejects.toBeInstanceOf(BadRequestException);
    // Discounted amount paid but no coupon in the notes
    await expect(build({ amount: 80000, currency: 'INR', notes: { orgId: 'org-1', planId: 'plan-pro' } }).execute('org-1', 'o', 'plan-pro'))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
