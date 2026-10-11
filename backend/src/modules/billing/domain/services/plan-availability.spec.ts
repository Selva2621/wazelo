import { canPurchasePlan } from './plan-availability';

const plan = { id: 'p-1', isActive: true, deletedAt: null };

describe('canPurchasePlan', () => {
  it('allows any org to buy a plan on sale', () => {
    expect(canPurchasePlan(plan, null)).toBe(true);
  });

  it('refuses a plan off sale (inactive or archived) to new buyers', () => {
    expect(canPurchasePlan({ ...plan, isActive: false }, null)).toBe(false);
    expect(canPurchasePlan({ ...plan, isActive: false }, 'p-other')).toBe(false);
  });

  it('lets an existing subscriber renew their own plan after it was archived', () => {
    expect(canPurchasePlan({ ...plan, isActive: false }, 'p-1')).toBe(true);
  });

  it('never sells a deleted plan', () => {
    expect(canPurchasePlan({ ...plan, deletedAt: new Date() }, 'p-1')).toBe(false);
  });
});
