import { EVENT_NAMES } from '@/common/constants';
import { SendRenewalRemindersUseCase } from './send-renewal-reminders.use-case';
import { renewalDueDetail } from '../../domain/services/renewal-reminders';

const NOW = new Date('2026-11-22T04:30:00Z');

function setup(subs: Array<{ id: string; currentPeriodEnd: Date; metadata?: unknown }>) {
  const markers = new Set<string>();
  const repo = {
    findPaidRenewalsEndingBetween: jest.fn(async (from: Date, to: Date) =>
      subs
        .filter((s) => s.currentPeriodEnd >= from && s.currentPeriodEnd < to)
        .map((s) => ({ ...s, orgId: 'o1', plan: { name: 'Pro' } })),
    ),
    hasEventWithKey: jest.fn(async (_id: string, _type: string, key: string) => markers.has(key)),
    recordEvent: jest.fn(async (e: { metadata: { key: string } }) => {
      markers.add(e.metadata.key);
    }),
  };
  const events = { emit: jest.fn() };
  return { useCase: new SendRenewalRemindersUseCase(repo as any, events as any), repo, events };
}

describe('SendRenewalRemindersUseCase', () => {
  it('looks at the UTC day windows 3 days and 1 day out', async () => {
    const t = setup([]);
    await t.useCase.execute(NOW);
    expect(t.repo.findPaidRenewalsEndingBetween).toHaveBeenCalledWith(new Date('2026-11-25T00:00:00Z'), new Date('2026-11-26T00:00:00Z'));
    expect(t.repo.findPaidRenewalsEndingBetween).toHaveBeenCalledWith(new Date('2026-11-23T00:00:00Z'), new Date('2026-11-24T00:00:00Z'));
  });

  it('emits one reminder per (subscription, days) and nothing again when the cron re-runs', async () => {
    const t = setup([
      { id: 's3', currentPeriodEnd: new Date('2026-11-25T15:00:00Z') },
      { id: 's1', currentPeriodEnd: new Date('2026-11-23T09:00:00Z') },
      { id: 'later', currentPeriodEnd: new Date('2026-11-27T09:00:00Z') },
    ]);
    expect(await t.useCase.execute(NOW)).toBe(2);
    expect(t.events.emit).toHaveBeenCalledWith(
      EVENT_NAMES.SUBSCRIPTION_RENEWAL_DUE,
      expect.objectContaining({ subscriptionId: 's3', daysLeft: 3, planName: 'Pro', periodEnd: '2026-11-25T15:00:00.000Z' }),
    );
    expect(t.events.emit).toHaveBeenCalledWith(
      EVENT_NAMES.SUBSCRIPTION_RENEWAL_DUE,
      expect.objectContaining({ subscriptionId: 's1', daysLeft: 1 }),
    );

    expect(await t.useCase.execute(new Date('2026-11-22T10:00:00Z'))).toBe(0);
    expect(t.events.emit).toHaveBeenCalledTimes(2);
  });

  it('skips plans whose next period is already paid', async () => {
    const t = setup([
      { id: 'paid', currentPeriodEnd: new Date('2026-11-25T15:00:00Z'), metadata: { prepaid: { periods: 1 } } },
    ]);
    expect(await t.useCase.execute(NOW)).toBe(0);
    expect(t.events.emit).not.toHaveBeenCalled();
    expect(t.repo.recordEvent).not.toHaveBeenCalled();
  });

  it('formats the WhatsApp detail line', () => {
    expect(renewalDueDetail(3, '2026-11-25T15:00:00Z')).toBe('3 days (25 Nov)');
    expect(renewalDueDetail(1, '2026-11-23T00:00:00Z')).toBe('1 day (23 Nov)');
  });
});
