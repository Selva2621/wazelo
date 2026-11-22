import { SubscriptionStatus } from '@prisma/client';

/**
 * Wazelo HQ: every sign-up is a lead in HQ's "Wazelo customers" pipeline, and the
 * deal follows the customer's subscription. The stage is always recomputed from the
 * current subscription, so events can arrive in any order (or twice) and the board
 * still ends up right.
 */

export type SignupStage = 'SIGNED_UP' | 'TRIAL' | 'PAID' | 'CHURNED';

export const HQ_CUSTOMER_PIPELINE = {
  name: 'Wazelo customers',
  description: 'Every Wazelo sign-up — moves on its own with their trial, payment and cancellation',
  stages: [
    { key: 'SIGNED_UP', name: 'Signed up', order: 0, color: '#64748b', isWonStage: false, isLostStage: false },
    { key: 'TRIAL', name: 'Trial', order: 1, color: '#0ea5e9', isWonStage: false, isLostStage: false },
    { key: 'PAID', name: 'Paid', order: 2, color: '#22c55e', isWonStage: true, isLostStage: false },
    { key: 'CHURNED', name: 'Churned', order: 3, color: '#ef4444', isWonStage: false, isLostStage: true },
  ] as const,
};

export const SIGNUP_TAG = 'wazelo-signup';

export function stageName(stage: SignupStage): string {
  return HQ_CUSTOMER_PIPELINE.stages.find((s) => s.key === stage)!.name;
}

/** Where a customer's deal belongs, from their latest subscription (null = none yet). */
export function signupStage(sub: { status: SubscriptionStatus; priceInCents: number } | null): SignupStage {
  if (!sub) return 'SIGNED_UP';
  switch (sub.status) {
    case SubscriptionStatus.TRIAL:
      return 'TRIAL';
    case SubscriptionStatus.ACTIVE:
    case SubscriptionStatus.PAST_DUE:
    case SubscriptionStatus.GRACE_PERIOD:
      // A ₹0 plan is not a paying customer yet
      return sub.priceInCents > 0 ? 'PAID' : 'SIGNED_UP';
    case SubscriptionStatus.CANCELLED:
    case SubscriptionStatus.EXPIRED:
      return 'CHURNED';
    default:
      return 'SIGNED_UP';
  }
}

export function signupName(u: { firstName: string; lastName: string; email: string }): string {
  return `${u.firstName} ${u.lastName}`.trim() || u.email;
}

export function signupDealTitle(name: string, orgName: string): string {
  return `${orgName} — ${name}`.slice(0, 500);
}
