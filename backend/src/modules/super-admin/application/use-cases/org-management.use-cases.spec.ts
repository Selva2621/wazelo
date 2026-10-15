import { BadRequestException } from '@nestjs/common';
import { AdminChangePlanUseCase, extendedTrialEnd } from './org-management.use-cases';

const DAY = 24 * 60 * 60 * 1000;

describe('extendedTrialEnd', () => {
  const now = new Date('2026-10-07T12:00:00Z');

  it('extends from the current trial end when it is in the future', () => {
    const end = new Date(now.getTime() + 3 * DAY);
    expect(extendedTrialEnd(end, 7, now).getTime()).toBe(end.getTime() + 7 * DAY);
  });

  it('extends from now when the trial end has already passed', () => {
    const end = new Date(now.getTime() - 2 * DAY);
    expect(extendedTrialEnd(end, 7, now).getTime()).toBe(now.getTime() + 7 * DAY);
  });

  it('extends from now when there is no trial end', () => {
    expect(extendedTrialEnd(null, 14, now).getTime()).toBe(now.getTime() + 14 * DAY);
  });
});

describe('AdminChangePlanUseCase', () => {
  const ctx = { actor: { id: 'admin-1', email: 'a@x.com' }, meta: {} };
  const oldPlan = { id: 'plan-old', name: 'Starter', priceInCents: 1000 };
  const newPlan = {
    id: 'plan-new', name: 'Pro', priceInCents: 5000, isActive: true, billingCycle: 'MONTHLY', currency: 'INR',
    maxMessagesPerMonth: 1, maxUsers: 1, maxWhatsappSessions: 1, maxCampaignsPerMonth: 1,
    maxApiCallsPerMonth: 1, aiCreditsPerMonth: 1, maxMessageTemplates: 1,
  };

  function setup(opts: { updateResult?: unknown; usageFails?: boolean } = {}) {
    const tx = { marker: 'tx' };
    const subscription = {
      id: 'sub-1', planId: oldPlan.id, plan: oldPlan, status: 'ACTIVE', scheduledPlanId: 'plan-cheap',
      priceInCents: 1000, currency: 'INR', currentPeriodStart: new Date(), currentPeriodEnd: new Date(),
    };
    const subscriptionRepo = {
      findByOrgWithPlan: jest.fn().mockResolvedValue(subscription),
      updatePlan: jest.fn().mockResolvedValue('updateResult' in opts ? opts.updateResult : { id: 'sub-1' }),
      recordEvent: jest.fn(),
    };
    const usageRepo = {
      resetUsageForOrg: opts.usageFails ? jest.fn().mockRejectedValue(new Error('db down')) : jest.fn(),
    };
    const prisma = { $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)) };
    const eventEmitter = { emit: jest.fn() };
    const audit = { record: jest.fn() };
    const useCase = new AdminChangePlanUseCase(
      subscriptionRepo as any,
      { findById: jest.fn().mockResolvedValue(newPlan) } as any,
      usageRepo as any,
      eventEmitter as any,
      audit as any,
      prisma as any,
    );
    return { useCase, tx, subscriptionRepo, usageRepo, prisma, eventEmitter, audit };
  }

  it('updates plan, usage limits and history inside one transaction, clearing a scheduled downgrade', async () => {
    const s = setup();
    await s.useCase.execute('org-1', newPlan.id, ctx);
    expect(s.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(s.subscriptionRepo.updatePlan).toHaveBeenCalledWith(
      'sub-1', newPlan.id, newPlan.priceInCents,
      expect.objectContaining({ scheduledPlanId: null, scheduledChangeAt: null }),
      s.tx,
    );
    expect(s.usageRepo.resetUsageForOrg.mock.calls[0][4]).toBe(s.tx);
    expect(s.subscriptionRepo.recordEvent.mock.calls[0][1]).toBe(s.tx);
    expect(s.eventEmitter.emit).toHaveBeenCalledTimes(1);
    expect(s.audit.record).toHaveBeenCalledTimes(1);
  });

  it('emits nothing and audits nothing when a step inside the transaction fails', async () => {
    const s = setup({ usageFails: true });
    await expect(s.useCase.execute('org-1', newPlan.id, ctx)).rejects.toThrow('db down');
    expect(s.subscriptionRepo.recordEvent).not.toHaveBeenCalled();
    expect(s.eventEmitter.emit).not.toHaveBeenCalled();
    expect(s.audit.record).not.toHaveBeenCalled();
  });

  it('rejects when the subscription changed meanwhile, without touching usage', async () => {
    const s = setup({ updateResult: null });
    await expect(s.useCase.execute('org-1', newPlan.id, ctx)).rejects.toBeInstanceOf(BadRequestException);
    expect(s.usageRepo.resetUsageForOrg).not.toHaveBeenCalled();
  });
});
