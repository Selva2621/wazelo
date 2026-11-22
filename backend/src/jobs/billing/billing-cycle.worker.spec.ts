import { SubscriptionStatus } from '@prisma/client';
import { EVENT_NAMES } from '@/common/constants';
import { BillingCycleWorker } from './billing-cycle.worker';

const PLAN = {
  id: 'p1',
  name: 'Pro',
  maxMessagesPerMonth: 1000,
  maxUsers: 5,
  maxWhatsappSessions: 1,
  maxCampaignsPerMonth: 10,
  maxApiCallsPerMonth: 100,
  aiCreditsPerMonth: 50,
  maxMessageTemplates: 20,
};

function sub(over: Record<string, unknown> = {}) {
  return {
    id: 's1',
    orgId: 'o1',
    planId: 'p1',
    plan: PLAN,
    status: SubscriptionStatus.ACTIVE,
    billingCycle: 'MONTHLY',
    priceInCents: 79900,
    currency: 'INR',
    cancelledAt: null,
    currentPeriodStart: new Date('2026-10-22T00:00:00Z'),
    currentPeriodEnd: new Date('2026-11-22T00:00:00Z'),
    ...over,
  };
}

function setup(credit: { invoiceId: string; appliedInCents: number; amountDueInCents: number } | null, locked?: unknown) {
  const subscriptionRepo = {
    // The row read under the lock (defaults to the due subscription itself)
    withLock: jest.fn(async (_id: string, work: (sub: unknown, tx: unknown) => unknown) => work(locked, { tx: true })),
    transitionStatus: jest.fn(async (id: string, _from: unknown, to: SubscriptionStatus) => ({ id, status: to })),
    recordEvent: jest.fn(),
  };
  const usageRepo = { resetUsageForOrg: jest.fn() };
  const paymentRepo = {
    markInvoicePaid: jest.fn(),
    createPayment: jest.fn(),
    getNextInvoiceNumber: jest.fn(async () => 'INV-1'),
    createInvoice: jest.fn(),
  };
  const audit = { log: jest.fn() };
  const events = { emit: jest.fn() };
  const applyCredit = { execute: jest.fn(async () => credit) };
  const worker = new BillingCycleWorker(
    subscriptionRepo as any,
    usageRepo as any,
    {} as any,
    paymentRepo as any,
    audit as any,
    events as any,
    applyCredit as any,
  );
  return { worker, subscriptionRepo, usageRepo, paymentRepo, events, applyCredit };
}

describe('BillingCycleWorker.renewSubscription (no auto-charge)', () => {
  it('credit covering the full price renews the plan (invoice paid, new period, usage reset)', async () => {
    const t = setup({ invoiceId: 'inv1', appliedInCents: 79900, amountDueInCents: 0 });
    await t.worker.renewSubscription(sub());

    expect(t.applyCredit.execute).toHaveBeenCalledWith(expect.objectContaining({ requireFullCover: true, priceInCents: 79900 }));
    expect(t.paymentRepo.markInvoicePaid).toHaveBeenCalledWith('inv1', {});
    expect(t.subscriptionRepo.transitionStatus).toHaveBeenCalledWith(
      's1',
      [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
      SubscriptionStatus.ACTIVE,
      expect.objectContaining({ currentPeriodEnd: expect.any(Date) }),
    );
    expect(t.usageRepo.resetUsageForOrg).toHaveBeenCalled();
    expect(t.events.emit).toHaveBeenCalledWith(EVENT_NAMES.SUBSCRIPTION_RENEWED, expect.anything());
    expect(t.paymentRepo.createPayment).not.toHaveBeenCalled();
  });

  it('no (or not enough) credit: the plan expires right away — no charge, no grace', async () => {
    const t = setup(null);
    await t.worker.renewSubscription(sub());

    expect(t.subscriptionRepo.transitionStatus).toHaveBeenCalledTimes(1);
    expect(t.subscriptionRepo.transitionStatus).toHaveBeenCalledWith(
      's1',
      [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
      SubscriptionStatus.EXPIRED,
    );
    expect(t.subscriptionRepo.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ newStatus: SubscriptionStatus.EXPIRED, metadata: expect.objectContaining({ type: 'period_ended_unpaid' }) }),
    );
    expect(t.events.emit).toHaveBeenCalledWith(EVENT_NAMES.SUBSCRIPTION_EXPIRED, {
      subscriptionId: 's1',
      orgId: 'o1',
      planId: 'p1',
      paidPeriodEnded: true,
    });
    expect(t.paymentRepo.createPayment).not.toHaveBeenCalled();
    expect(t.paymentRepo.markInvoicePaid).not.toHaveBeenCalled();
    expect(t.usageRepo.resetUsageForOrg).not.toHaveBeenCalled();
  });

  it('a leftover PAST_DUE subscription is ended too (not stuck)', async () => {
    const t = setup(null);
    await t.worker.renewSubscription(sub({ status: SubscriptionStatus.PAST_DUE }));
    expect(t.subscriptionRepo.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ previousStatus: SubscriptionStatus.PAST_DUE, newStatus: SubscriptionStatus.EXPIRED }),
    );
  });

  it('a prepaid subscription renews from the old period end, resets usage and removes the marker at 0', async () => {
    const due = sub({ metadata: { source: 'x', prepaid: { periods: 1, payments: [], paidUntil: '2026-12-22T00:00:00.000Z' } } });
    const t = setup(null, due);
    const oldEnd = new Date('2026-11-22T00:00:00Z');
    const newEnd = new Date('2026-12-22T00:00:00Z');
    await t.worker.renewSubscription(due);

    expect(t.applyCredit.execute).not.toHaveBeenCalled();
    expect(t.subscriptionRepo.transitionStatus).toHaveBeenCalledTimes(1);
    expect(t.subscriptionRepo.transitionStatus).toHaveBeenCalledWith(
      's1',
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.ACTIVE,
      { currentPeriodStart: oldEnd, currentPeriodEnd: newEnd, metadata: { source: 'x' } },
      { tx: true },
    );
    expect(t.usageRepo.resetUsageForOrg).toHaveBeenCalledWith('o1', oldEnd, newEnd, expect.anything());
    // The prepaid invoice already exists (PAID): no new one, no charge, no expiry
    expect(t.paymentRepo.createInvoice).not.toHaveBeenCalled();
    expect(t.paymentRepo.createPayment).not.toHaveBeenCalled();
    expect(t.events.emit).toHaveBeenCalledWith(EVENT_NAMES.SUBSCRIPTION_RENEWED, expect.anything());
    expect(t.events.emit).not.toHaveBeenCalledWith(EVENT_NAMES.SUBSCRIPTION_EXPIRED, expect.anything());
  });

  it('with several prepaid periods it uses one up and recomputes paidUntil', async () => {
    const payments = [{ paymentId: 'a', invoiceId: 'ia', paidAt: 'x' }, { paymentId: 'b', invoiceId: 'ib', paidAt: 'y' }];
    const due = sub({ metadata: { prepaid: { periods: 2, payments, paidUntil: '2027-01-22T00:00:00.000Z' } } });
    const t = setup(null, due);
    await t.worker.renewSubscription(due);

    const extra = (t.subscriptionRepo.transitionStatus.mock.calls[0] as unknown[])[3] as Record<string, any>;
    expect(extra.metadata).toEqual({ prepaid: { periods: 1, payments, paidUntil: '2027-01-22T00:00:00.000Z' } });
    expect(extra.currentPeriodEnd).toEqual(new Date('2026-12-22T00:00:00Z'));
  });

  it('a prepaid renewal is skipped when the row changed under the lock', async () => {
    const due = sub({ metadata: { prepaid: { periods: 1, payments: [], paidUntil: '' } } });
    const t = setup(null, { ...due, currentPeriodEnd: new Date('2026-12-22T00:00:00Z') });
    await t.worker.renewSubscription(due);
    expect(t.subscriptionRepo.transitionStatus).not.toHaveBeenCalled();
    expect(t.usageRepo.resetUsageForOrg).not.toHaveBeenCalled();
  });

  it('free plans renew without touching credit', async () => {
    const t = setup(null);
    await t.worker.renewSubscription(sub({ priceInCents: 0 }));
    expect(t.applyCredit.execute).not.toHaveBeenCalled();
    expect(t.events.emit).toHaveBeenCalledWith(EVENT_NAMES.SUBSCRIPTION_RENEWED, expect.anything());
  });

  it('a plan cancelled during the period ends as CANCELLED', async () => {
    const t = setup(null);
    await t.worker.renewSubscription(sub({ cancelledAt: new Date() }));
    expect(t.applyCredit.execute).not.toHaveBeenCalled();
    expect(t.subscriptionRepo.transitionStatus).toHaveBeenCalledWith(
      's1',
      [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
      SubscriptionStatus.CANCELLED,
    );
  });
});
