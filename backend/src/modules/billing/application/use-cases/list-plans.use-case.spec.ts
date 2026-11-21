import { Plan } from '@prisma/client';
import { plansIn } from './list-plans.use-case';

const plan = (slug: string, currency: string, priceInCents: number) =>
  ({ id: slug, slug, currency, priceInCents }) as Plan;

describe('plansIn', () => {
  const free = plan('free', 'INR', 0);
  const starterInr = plan('starter', 'INR', 99900);
  const starterUsd = plan('starter-usd', 'USD', 1500);

  it('keeps only plans in the currency', () => {
    expect(plansIn([free, starterInr, starterUsd], 'INR')).toEqual([free, starterInr]);
  });

  it('keeps a free plan in another currency when the currency has none', () => {
    expect(plansIn([free, starterInr, starterUsd], 'USD')).toEqual([free, starterUsd]);
  });

  it('drops the other free plan when the currency has its own', () => {
    const freeUsd = plan('free-usd', 'USD', 0);
    expect(plansIn([free, starterInr, freeUsd, starterUsd], 'USD')).toEqual([freeUsd, starterUsd]);
  });

  it('shows everything while no plan is priced in the currency yet', () => {
    expect(plansIn([free, starterInr], 'USD')).toEqual([free, starterInr]);
  });
});
