import { SubscriptionStatus } from '@prisma/client';
import { ReactivateSubscriptionUseCase } from './reactivate-subscription.use-case';

function setup(status: SubscriptionStatus) {
  const repo = {
    findActiveByOrg: jest.fn(async () => ({ id: 's1', status, cancelledAt: null, billingCycle: 'MONTHLY' })),
    transitionStatus: jest.fn(),
    recordEvent: jest.fn(),
  };
  const useCase = new ReactivateSubscriptionUseCase(repo as any, { log: jest.fn() } as any, { emit: jest.fn() } as any);
  return { repo, run: () => useCase.execute('o1', 'u1', 'ip', 'ua') };
}

describe('ReactivateSubscriptionUseCase: no free periods', () => {
  it.each([SubscriptionStatus.GRACE_PERIOD, SubscriptionStatus.PAST_DUE])('refuses %s (pay to renew)', async (status) => {
    const t = setup(status);
    await expect(t.run()).rejects.toThrow('Pay to renew from Billing');
    expect(t.repo.transitionStatus).not.toHaveBeenCalled();
  });

  it('refuses an ACTIVE plan that was not cancelled', async () => {
    const t = setup(SubscriptionStatus.ACTIVE);
    await expect(t.run()).rejects.toThrow('Cannot reactivate');
    expect(t.repo.transitionStatus).not.toHaveBeenCalled();
  });
});
