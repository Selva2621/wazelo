import { SubscriptionStatus } from '@prisma/client';
import { EVENT_NAMES } from '@/common/constants';
import { RenewSubscriptionPaymentUseCase } from './renew-subscription-payment.use-case';

const PLAN = {
  id: 'p1',
  name: 'Pro',
  priceInCents: 79900,
  currency: 'INR',
  billingCycle: 'MONTHLY',
  maxMessagesPerMonth: 1000,
  maxUsers: 5,
  maxWhatsappSessions: 1,
  maxCampaignsPerMonth: 10,
  maxApiCallsPerMonth: 100,
  aiCreditsPerMonth: 50,
  maxMessageTemplates: 20,
};

const START = new Date('2026-11-01T00:00:00Z');

function setup(sub: Record<string, unknown>, opts: { alreadyPaid?: boolean } = {}) {
  const existing = {
    id: 's1',
    orgId: 'o1',
    planId: 'p1',
    status: SubscriptionStatus.ACTIVE,
    priceInCents: 79900,
    currentPeriodStart: START,
    currentPeriodEnd: new Date(Date.now() + 3 * 86400_000),
    cancelledAt: null,
    trialEndsAt: null,
    ...sub,
  };
  const planRepo = { findById: jest.fn(async () => PLAN) };
  const subscriptionRepo = {
    transitionStatus: jest.fn(
      async (id: string, _from: unknown, to: SubscriptionStatus, extra: Record<string, unknown>) => ({ id, status: to, ...extra }),
    ),
    recordEvent: jest.fn(),
    findById: jest.fn(async () => existing),
    // Row re-read under the lock: what the DB holds right now
    lockForUpdate: jest.fn(async () => existing),
  };
  const paymentRepo = {
    findPaymentByIdempotencyKey: jest.fn(async () => (opts.alreadyPaid ? { id: 'pay0' } : null)),
    findPaymentByExternalId: jest.fn(async () => null),
    createPayment: jest.fn(async () => ({ id: 'pay1' })),
    transitionPaymentStatus: jest.fn(),
    getNextInvoiceNumber: jest.fn(async () => 'INV-1'),
    createInvoice: jest.fn(async () => ({ id: 'inv1' })),
    transitionInvoiceStatus: jest.fn(),
  };
  const usageRepo = { resetUsageForOrg: jest.fn() };
  const audit = { log: jest.fn() };
  const events = { emit: jest.fn() };
  const prisma = { $transaction: jest.fn((work: (tx: unknown) => unknown) => work({})) };
  const useCase = new RenewSubscriptionPaymentUseCase(
    planRepo as any,
    subscriptionRepo as any,
    paymentRepo as any,
    usageRepo as any,
    audit as any,
    events as any,
    prisma as any,
  );
  const run = (planId = 'p1') =>
    useCase.execute('o1', 'u1', existing as any, { planId, orderId: 'order_1', razorpayPaymentId: 'pay_1' });
  return { run, existing, subscriptionRepo, paymentRepo, usageRepo, events };
}

const oneMonthAfter = (d: Date) => {
  const e = new Date(d);
  e.setMonth(e.getMonth() + 1);
  return e;
};

describe('RenewSubscriptionPaymentUseCase', () => {
  it('paying early prepays the next period: current period untouched, marker merged, cancel undone', async () => {
    const t = setup({ cancelledAt: new Date(), metadata: { source: 'x' } });
    const end = t.existing.currentPeriodEnd as Date;
    const res = await t.run();

    const [id, from, to, extra] = t.subscriptionRepo.transitionStatus.mock.calls[0];
    expect([id, from, to]).toEqual(['s1', SubscriptionStatus.ACTIVE, SubscriptionStatus.ACTIVE]);
    expect(extra).not.toHaveProperty('currentPeriodStart');
    expect(extra).not.toHaveProperty('currentPeriodEnd');
    expect(extra).toMatchObject({
      cancelledAt: null,
      metadata: {
        source: 'x',
        prepaid: {
          periods: 1,
          payments: [{ paymentId: 'pay1', invoiceId: 'inv1', paidAt: expect.any(String) }],
          paidUntil: oneMonthAfter(end).toISOString(),
        },
      },
    });
    expect(t.paymentRepo.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ periodStart: end, periodEnd: oneMonthAfter(end), amountInCents: 79900, paymentId: 'pay1' }),
      expect.anything(),
    );
    expect(t.paymentRepo.transitionInvoiceStatus).toHaveBeenCalledWith('inv1', 'DRAFT', 'PAID', expect.anything(), expect.anything());
    expect(t.usageRepo.resetUsageForOrg).not.toHaveBeenCalled();
    expect(res).toMatchObject({ prepaid: true, deduplicated: false });
  });

  it('a second early payment adds a second period (paidUntil = end + 2 cycles, invoice for the 2nd cycle)', async () => {
    const end = new Date(Date.now() + 3 * 86400_000);
    const first = { paymentId: 'pay0', invoiceId: 'inv0', paidAt: 'x' };
    const t = setup({ currentPeriodEnd: end, metadata: { prepaid: { periods: 1, payments: [first], paidUntil: oneMonthAfter(end).toISOString() } } });
    const res = await t.run();

    const twoMonths = oneMonthAfter(oneMonthAfter(end));
    expect(t.paymentRepo.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ periodStart: oneMonthAfter(end), periodEnd: twoMonths }),
      expect.anything(),
    );
    const extra = t.subscriptionRepo.transitionStatus.mock.calls[0][3] as Record<string, any>;
    expect(extra.metadata.prepaid).toMatchObject({ periods: 2, paidUntil: twoMonths.toISOString() });
    expect(extra.metadata.prepaid.payments.map((p: { paymentId: string }) => p.paymentId)).toEqual(['pay0', 'pay1']);
    expect(res).toMatchObject({ prepaid: true, prepaidPeriods: 2 });
  });

  it('reads the prepaid count under the row lock (a payment that landed meanwhile still counts)', async () => {
    const end = new Date(Date.now() + 3 * 86400_000);
    const t = setup({ currentPeriodEnd: end, metadata: null });
    t.subscriptionRepo.lockForUpdate.mockResolvedValueOnce({
      ...t.existing,
      metadata: { prepaid: { periods: 1, payments: [], paidUntil: oneMonthAfter(end).toISOString() } },
    } as any);
    await t.run();
    expect(t.subscriptionRepo.lockForUpdate).toHaveBeenCalledWith('s1', expect.anything());
    const extra = t.subscriptionRepo.transitionStatus.mock.calls[0][3] as Record<string, any>;
    expect(extra.metadata.prepaid.periods).toBe(2);
  });

  it('an unpaid (grace) plan becomes ACTIVE on the paid plan with a new period from now', async () => {
    const t = setup({ status: SubscriptionStatus.GRACE_PERIOD, planId: 'trial', currentPeriodEnd: new Date(Date.now() - 86400_000) });
    const before = Date.now();
    await t.run('p1');

    const [, from, to, extra] = t.subscriptionRepo.transitionStatus.mock.calls[0];
    expect(from).toBe(SubscriptionStatus.GRACE_PERIOD);
    expect(to).toBe(SubscriptionStatus.ACTIVE);
    expect((extra.currentPeriodStart as Date).getTime()).toBeGreaterThanOrEqual(before);
    expect(extra.currentPeriodEnd).toEqual(oneMonthAfter(extra.currentPeriodStart as Date));
    expect(extra).toMatchObject({ planId: 'p1', priceInCents: 79900, graceEndsAt: null });
    expect(t.usageRepo.resetUsageForOrg).toHaveBeenCalled();
  });

  it('an ACTIVE period that already ran out (worker not yet run) starts a new period from now', async () => {
    const t = setup({ currentPeriodEnd: new Date(Date.now() - 60_000) });
    await t.run();
    const extra = t.subscriptionRepo.transitionStatus.mock.calls[0][3];
    expect((extra.currentPeriodStart as Date).getTime()).toBeGreaterThan(START.getTime());
    expect(t.usageRepo.resetUsageForOrg).toHaveBeenCalled();
  });

  it('a replayed verify (payment already recorded) does not extend twice', async () => {
    const t = setup({}, { alreadyPaid: true });
    const res = await t.run();
    expect(res.deduplicated).toBe(true);
    expect(t.subscriptionRepo.transitionStatus).not.toHaveBeenCalled();
    expect(t.paymentRepo.createPayment).not.toHaveBeenCalled();
  });

  it('handles the same plan while ACTIVE and any plan while unpaid; not a plan change or a trial', () => {
    expect(RenewSubscriptionPaymentUseCase.handles({ status: 'ACTIVE', planId: 'p1' } as any, 'p1')).toBe(true);
    expect(RenewSubscriptionPaymentUseCase.handles({ status: 'ACTIVE', planId: 'p1' } as any, 'p2')).toBe(false);
    expect(RenewSubscriptionPaymentUseCase.handles({ status: 'PAST_DUE', planId: 'p1' } as any, 'p2')).toBe(true);
    expect(RenewSubscriptionPaymentUseCase.handles({ status: 'TRIAL', planId: 'p1' } as any, 'p1')).toBe(false);
  });
});
