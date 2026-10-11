import { BadRequestException, ConflictException } from '@nestjs/common';
import { SubscribeUseCase } from './subscribe.use-case';
import { CouponCheckoutService } from '../services/coupon-checkout.service';
import { CouponRedemptionError } from '../../infrastructure/repositories/coupon.repository';

const paidPlan = {
  id: 'plan-pro', name: 'Pro', slug: 'pro', priceInCents: 100000, currency: 'INR', billingCycle: 'MONTHLY',
  trialDays: 0, isActive: true, deletedAt: null, maxMessagesPerMonth: 1, maxUsers: 1, maxWhatsappSessions: 1,
  maxCampaignsPerMonth: 1, maxApiCallsPerMonth: 1, aiCreditsPerMonth: 1, maxMessageTemplates: 1,
};

function coupon(percentOff: number) {
  return {
    id: 'cp-1', code: 'FREE', kind: 'PERCENT', percentOff, amountOffInCents: null, currency: null, maxRedemptions: 1,
    redemptionCount: 0, validFrom: null, validUntil: null, appliesToPlanIds: [], firstPaymentOnly: true, active: true,
  };
}

/** The fake "transaction" records writes and discards them if the callback throws. */
function setup(opts: { plan?: any; percentOff?: number; redeemError?: Error } = {}) {
  const committed: string[] = [];
  const couponRepo = {
    findByCode: jest.fn(async () => coupon(opts.percentOff ?? 100)),
    hasRedeemed: jest.fn(async () => false),
    redeem: jest.fn(async () => {
      if (opts.redeemError) throw opts.redeemError;
      return { id: 'red-1' };
    }),
  };
  const prisma = {
    $transaction: jest.fn(async (work: (tx: any) => Promise<any>) => {
      const writes: string[] = [];
      const tx = { writes };
      const out = await work(tx);
      committed.push(...writes);
      return out;
    }),
    organization: { findUnique: jest.fn(async () => ({ trialUsedAt: null })), update: jest.fn() },
  };
  const subscriptionRepo = {
    findByIdempotencyKey: jest.fn(async () => null),
    findActiveByOrg: jest.fn(async () => null),
    create: jest.fn(async (input: any, tx: any) => { tx.writes.push('subscription'); return { id: 'sub-1', ...input }; }),
    recordEvent: jest.fn(),
  };
  const paymentRepo = {
    createPayment: jest.fn(async (input: any, tx: any) => { tx.writes.push('payment'); return { id: 'pay-1', ...input }; }),
    transitionPaymentStatus: jest.fn(),
    getNextInvoiceNumber: jest.fn(async () => 'INV-00000001'),
    createInvoice: jest.fn(async (input: any, tx: any) => { tx.writes.push('invoice'); return { id: 'inv-1', ...input }; }),
    transitionInvoiceStatus: jest.fn(),
  };
  const activateTrial = { execute: jest.fn(async () => ({ subscription: { id: 'trial-1', status: 'ACTIVE' }, deduplicated: false })) };
  const uc = new SubscribeUseCase(
    { findById: jest.fn(async () => opts.plan ?? paidPlan) } as any,
    subscriptionRepo as any,
    { resetUsageForOrg: jest.fn() } as any,
    paymentRepo as any,
    { log: jest.fn() } as any,
    { emit: jest.fn() } as any,
    prisma as any,
    new CouponCheckoutService(couponRepo as any),
    activateTrial as any,
  );
  return { uc, committed, couponRepo, paymentRepo, activateTrial, subscriptionRepo };
}

describe('SubscribeUseCase with a coupon', () => {
  it('a 100%-off coupon activates a paid plan without payment: PAID 0 invoice + redemption, one transaction', async () => {
    const { uc, committed, couponRepo, paymentRepo } = setup();
    const out = await uc.execute('org-1', 'user-1', { planId: 'plan-pro', couponCode: 'free' }, 'ip', 'ua');
    expect(out.subscription?.status).toBe('ACTIVE');
    expect(paymentRepo.createPayment).not.toHaveBeenCalled();
    const invoice = paymentRepo.createInvoice.mock.calls[0][0];
    expect(invoice.amountInCents).toBe(0);
    expect(invoice.lineItems.map((l: any) => l.amount)).toEqual([100000, -100000]);
    expect(couponRepo.redeem).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      couponId: 'cp-1', orgId: 'org-1', subscriptionId: 'sub-1', invoiceId: 'inv-1', discountInCents: 100000, currency: 'INR',
    }));
    expect(committed).toEqual(['subscription', 'invoice']);
  });

  it('a partial coupon still requires payment when subscribing directly', async () => {
    const { uc } = setup({ percentOff: 20 });
    await expect(uc.execute('org-1', 'user-1', { planId: 'plan-pro', couponCode: 'FREE' }, 'ip', 'ua'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('a coupon priced into a paid order charges the discounted amount', async () => {
    const { uc, paymentRepo } = setup();
    await uc.execute(
      'org-1', 'user-1',
      { planId: 'plan-pro', razorpayPaymentId: 'pay_x', checkoutCoupon: { couponId: 'cp-1', code: 'SAVE20', discountInCents: 20000 } },
      'ip', 'ua',
    );
    expect(paymentRepo.createPayment.mock.calls[0][0].amountInCents).toBe(80000);
    expect(paymentRepo.createInvoice.mock.calls[0][0].amountInCents).toBe(80000);
  });

  it('when the atomic redemption fails nothing is committed and the caller gets a 409', async () => {
    const { uc, committed } = setup({ redeemError: new CouponRedemptionError('exhausted') });
    await expect(uc.execute('org-1', 'user-1', { planId: 'plan-pro', couponCode: 'FREE' }, 'ip', 'ua'))
      .rejects.toBeInstanceOf(ConflictException);
    expect(committed).toEqual([]);
  });

  it('converts an existing TRIAL when a coupon covers the full price (no payment)', async () => {
    const { uc, activateTrial, subscriptionRepo } = setup();
    const trial = { id: 'trial-1', status: 'TRIAL', planId: 'plan-pro' };
    subscriptionRepo.findActiveByOrg.mockResolvedValueOnce(trial as any);
    const out = await uc.execute('org-1', 'user-1', { planId: 'plan-pro', couponCode: 'FREE' }, 'ip', 'ua');
    expect(out.subscription?.status).toBe('ACTIVE');
    expect(activateTrial.execute).toHaveBeenCalledWith('org-1', 'user-1', trial, expect.objectContaining({
      planId: 'plan-pro', coupon: { couponId: 'cp-1', code: 'FREE', discountInCents: 100000 },
    }));
  });

  it('still refuses a second subscription for an org on TRIAL without a full-cover coupon', async () => {
    const { uc, subscriptionRepo } = setup({ percentOff: 20 });
    subscriptionRepo.findActiveByOrg.mockResolvedValue({ id: 'trial-1', status: 'TRIAL' } as any);
    await expect(uc.execute('org-1', 'user-1', { planId: 'plan-pro', couponCode: 'FREE' }, 'ip', 'ua'))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(uc.execute('org-1', 'user-1', { planId: 'plan-pro' }, 'ip', 'ua')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects coupons on free and trial plans', async () => {
    await expect(setup({ plan: { ...paidPlan, priceInCents: 0 } }).uc.execute('org-1', 'u', { planId: 'p', couponCode: 'FREE' }, 'ip', 'ua'))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(setup({ plan: { ...paidPlan, trialDays: 14 } }).uc.execute('org-1', 'u', { planId: 'p', couponCode: 'FREE' }, 'ip', 'ua'))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
