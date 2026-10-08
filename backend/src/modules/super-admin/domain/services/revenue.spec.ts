import { computeRevenue } from './revenue';

describe('computeRevenue', () => {
  it('normalises yearly plans to monthly', () => {
    const [usd] = computeRevenue([
      { currency: 'USD', billingCycle: 'MONTHLY', totalCents: 1000, subscriptions: 1 },
      { currency: 'USD', billingCycle: 'YEARLY', totalCents: 12000, subscriptions: 1 },
    ]);
    expect(usd).toEqual({ currency: 'USD', mrrCents: 2000, arrCents: 24000, payingSubscriptions: 2 });
  });

  it('keeps currencies separate and sorts by MRR', () => {
    const result = computeRevenue([
      { currency: 'usd', billingCycle: 'MONTHLY', totalCents: 500, subscriptions: 1 },
      { currency: 'INR', billingCycle: 'MONTHLY', totalCents: 49900, subscriptions: 2 },
    ]);
    expect(result.map((r) => r.currency)).toEqual(['INR', 'USD']);
    expect(result[1].mrrCents).toBe(500);
  });

  it('rounds yearly fractions only once, at the end', () => {
    const [inr] = computeRevenue([
      { currency: 'INR', billingCycle: 'YEARLY', totalCents: 100, subscriptions: 1 },
      { currency: 'INR', billingCycle: 'YEARLY', totalCents: 100, subscriptions: 1 },
    ]);
    expect(inr.mrrCents).toBe(17); // 200 / 12 = 16.67
    expect(inr.arrCents).toBe(200);
  });

  it('returns nothing when there are no paying subscriptions', () => {
    expect(computeRevenue([])).toEqual([]);
  });
});
