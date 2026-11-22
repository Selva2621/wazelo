import { SubscriptionStatus } from '@prisma/client';
import { signupDealTitle, signupName, signupStage, stageName } from './signup-lead';

describe('signupStage', () => {
  it.each([
    [null, 'SIGNED_UP'],
    [{ status: SubscriptionStatus.TRIAL, priceInCents: 0 }, 'TRIAL'],
    [{ status: SubscriptionStatus.ACTIVE, priceInCents: 99900 }, 'PAID'],
    [{ status: SubscriptionStatus.PAST_DUE, priceInCents: 99900 }, 'PAID'],
    [{ status: SubscriptionStatus.GRACE_PERIOD, priceInCents: 99900 }, 'PAID'],
    [{ status: SubscriptionStatus.ACTIVE, priceInCents: 0 }, 'SIGNED_UP'],
    [{ status: SubscriptionStatus.CANCELLED, priceInCents: 99900 }, 'CHURNED'],
    [{ status: SubscriptionStatus.EXPIRED, priceInCents: 0 }, 'CHURNED'],
  ])('%j → %s', (sub, stage) => {
    expect(signupStage(sub as any)).toBe(stage);
  });

  it('maps each stage to its pipeline column', () => {
    expect(['SIGNED_UP', 'TRIAL', 'PAID', 'CHURNED'].map((s) => stageName(s as any))).toEqual([
      'Signed up',
      'Trial',
      'Paid',
      'Churned',
    ]);
  });

  it('names the lead and the deal', () => {
    expect(signupName({ firstName: 'Priya', lastName: 'S', email: 'p@x.io' })).toBe('Priya S');
    expect(signupName({ firstName: ' ', lastName: '', email: 'p@x.io' })).toBe('p@x.io');
    expect(signupDealTitle('Priya S', 'Acme')).toBe('Acme — Priya S');
  });
});
