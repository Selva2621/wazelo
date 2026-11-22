import { SubscriptionStatus } from '@prisma/client';
import { CancelSubscriptionUseCase } from './cancel-subscription.use-case';
import { ReactivateSubscriptionUseCase } from './reactivate-subscription.use-case';

const END = new Date('2026-12-22T00:00:00Z');

function repo(sub: Record<string, unknown>) {
  return {
    findActiveByOrg: jest.fn().mockResolvedValue({ id: 's1', currentPeriodEnd: END, cancelledAt: null, billingCycle: 'MONTHLY', ...sub }),
    transitionStatus: jest.fn(async (_id: string, _from: unknown, to: SubscriptionStatus, extra: Record<string, unknown>) => ({ id: 's1', status: to, ...extra })),
    recordEvent: jest.fn(),
  };
}
const deps = () => ({ audit: { log: jest.fn() }, events: { emit: jest.fn() } });

describe('cancel at period end', () => {
  it('a paid plan stays ACTIVE until its period ends; only cancelledAt is set', async () => {
    const r = repo({ status: SubscriptionStatus.ACTIVE });
    const d = deps();
    const res = await new CancelSubscriptionUseCase(r as any, d.audit as any, d.events as any).execute('o1', 'u1', { reason: 'too costly' } as any, 'ip', 'ua');
    expect(r.transitionStatus).toHaveBeenCalledWith('s1', 'ACTIVE', 'ACTIVE', expect.objectContaining({ cancelledAt: expect.any(Date), cancelReason: 'too costly' }));
    expect(res.endsAt).toEqual(END);
  });

  it('an unpaid plan (grace) ends now', async () => {
    const r = repo({ status: SubscriptionStatus.GRACE_PERIOD });
    const d = deps();
    await new CancelSubscriptionUseCase(r as any, d.audit as any, d.events as any).execute('o1', 'u1', {} as any, 'ip', 'ua');
    expect(r.transitionStatus).toHaveBeenCalledWith('s1', ['PAST_DUE', 'GRACE_PERIOD'], 'CANCELLED', expect.anything());
  });

  it('cancelling twice is refused', async () => {
    const r = repo({ status: SubscriptionStatus.ACTIVE, cancelledAt: new Date() });
    const d = deps();
    await expect(new CancelSubscriptionUseCase(r as any, d.audit as any, d.events as any).execute('o1', 'u1', {} as any, 'ip', 'ua')).rejects.toThrow('already cancelled');
  });

  it('"Keep my plan" before the end just clears the cancel — same period, no new charge', async () => {
    const r = repo({ status: SubscriptionStatus.ACTIVE, cancelledAt: new Date() });
    const d = deps();
    await new ReactivateSubscriptionUseCase(r as any, d.audit as any, d.events as any).execute('o1', 'u1', 'ip', 'ua');
    expect(r.transitionStatus).toHaveBeenCalledWith('s1', 'ACTIVE', 'ACTIVE', { cancelledAt: null, cancelReason: null });
    expect(r.transitionStatus).toHaveBeenCalledTimes(1);
  });
});
