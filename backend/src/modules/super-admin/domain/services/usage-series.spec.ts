import { buildDailyUsage, usageWindowStart } from './usage-series';

const now = new Date('2026-10-10T15:30:00Z');

describe('usage series', () => {
  it('window starts at UTC midnight and covers whole days', () => {
    expect(usageWindowStart(1, now).toISOString()).toBe('2026-10-10T00:00:00.000Z');
    expect(usageWindowStart(7, now).toISOString()).toBe('2026-10-04T00:00:00.000Z');
  });

  it('fills every day, oldest first, splitting directions and counting outbound failures', () => {
    const out = buildDailyUsage(
      [
        { day: '2026-10-08', direction: 'OUTBOUND', total: 10, failed: 2 },
        { day: '2026-10-08', direction: 'INBOUND', total: 4, failed: 0 },
        { day: '2026-10-10', direction: 'OUTBOUND', total: 1, failed: 0 },
        { day: '2026-01-01', direction: 'OUTBOUND', total: 99, failed: 0 }, // outside window: ignored
      ],
      3,
      now,
    );
    expect(out.map((d) => d.date)).toEqual(['2026-10-08', '2026-10-09', '2026-10-10']);
    expect(out[0]).toEqual({ date: '2026-10-08', outbound: 10, inbound: 4, failed: 2 });
    expect(out[1]).toEqual({ date: '2026-10-09', outbound: 0, inbound: 0, failed: 0 });
    expect(out[2].outbound).toBe(1);
  });
});
