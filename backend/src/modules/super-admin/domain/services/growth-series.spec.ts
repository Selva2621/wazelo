import { buildGrowthSeries, lastMonths, windowStart } from './growth-series';

describe('growth series', () => {
  const now = new Date('2026-03-15T10:00:00Z');

  it('lists the last N months oldest first, crossing a year boundary', () => {
    expect(lastMonths(4, now)).toEqual(['2025-12', '2026-01', '2026-02', '2026-03']);
    expect(windowStart(4, now).toISOString()).toBe('2025-12-01T00:00:00.000Z');
  });

  it('fills missing months with zeros and keeps currencies apart', () => {
    const series = buildGrowthSeries(lastMonths(3, now), {
      newOrgs: [{ month: '2026-02', count: 4 }],
      newPaying: [{ month: '2026-03', count: 2 }],
      churned: [{ month: '2026-01', count: 1 }],
      revenue: [
        { month: '2026-03', currency: 'INR', amountCents: 49900 },
        { month: '2026-03', currency: 'usd', amountCents: 1000 },
        { month: '2026-03', currency: 'INR', amountCents: 100 },
      ],
    });
    expect(series).toEqual([
      { month: '2026-01', newOrgs: 0, newPaying: 0, churned: 1, revenue: {} },
      { month: '2026-02', newOrgs: 4, newPaying: 0, churned: 0, revenue: {} },
      { month: '2026-03', newOrgs: 0, newPaying: 2, churned: 0, revenue: { INR: 50000, USD: 1000 } },
    ]);
  });

  it('ignores rows outside the window', () => {
    const series = buildGrowthSeries(lastMonths(1, now), {
      newOrgs: [{ month: '2025-01', count: 9 }],
      newPaying: [],
      churned: [],
      revenue: [],
    });
    expect(series[0].newOrgs).toBe(0);
  });
});
