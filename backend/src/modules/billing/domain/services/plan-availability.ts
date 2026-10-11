/**
 * Whether an org may pay for `plan`. Plans off sale (inactive or archived) can't be bought,
 * except by an org already subscribed to that exact plan paying to renew it — archiving a
 * plan must never strand its existing subscribers. Pure logic.
 */
export function canPurchasePlan(
  plan: { id: string; isActive: boolean; deletedAt: Date | null },
  currentPlanId: string | null | undefined,
): boolean {
  if (plan.deletedAt) return false;
  return plan.isActive || currentPlanId === plan.id;
}
