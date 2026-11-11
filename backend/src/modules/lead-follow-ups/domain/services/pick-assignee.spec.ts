import { pickAssignee } from './pick-assignee';

const t = (iso: string) => new Date(iso);

describe('pickAssignee', () => {
  it('gives the lead to whoever has the fewest leads waiting', () => {
    expect(
      pickAssignee(['ravi', 'priya'], [
        { userId: 'ravi', open: 3, lastAssignedAt: t('2026-11-10T09:00:00Z') },
        { userId: 'priya', open: 1, lastAssignedAt: t('2026-11-10T10:00:00Z') },
      ]),
    ).toBe('priya');
  });

  it('on a tie, picks who got a lead longest ago; never-assigned first', () => {
    expect(
      pickAssignee(['ravi', 'priya', 'karthik'], [
        { userId: 'ravi', open: 0, lastAssignedAt: t('2026-11-10T09:00:00Z') },
        { userId: 'priya', open: 0, lastAssignedAt: t('2026-11-10T08:00:00Z') },
      ]),
    ).toBe('karthik');
    expect(
      pickAssignee(['ravi', 'priya'], [
        { userId: 'ravi', open: 0, lastAssignedAt: t('2026-11-10T09:00:00Z') },
        { userId: 'priya', open: 0, lastAssignedAt: t('2026-11-10T08:00:00Z') },
      ]),
    ).toBe('priya');
  });

  it('falls back to list order, and returns null with no team', () => {
    expect(pickAssignee(['ravi', 'priya'], [])).toBe('ravi');
    expect(pickAssignee([], [])).toBeNull();
  });
});
