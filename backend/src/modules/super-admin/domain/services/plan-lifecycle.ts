export const PLAN_HAS_HISTORY_MESSAGE = 'This plan has subscription history — archive it instead';

/**
 * A plan can be hard-removed (soft delete) only if no subscription ever referenced it, in any
 * status; deleting one with history would orphan invoices, payments and renewals. Pure logic.
 * Returns the reason it can't be deleted, or null when it can.
 */
export function planDeletionBlocker(subscriptionHistoryCount: number): string | null {
  return subscriptionHistoryCount > 0 ? PLAN_HAS_HISTORY_MESSAGE : null;
}

/**
 * An archived plan must be unarchived before it can be put back on sale, so "archived" and
 * "active" are never true at once. Returns the reason an edit is refused, or null.
 */
export function archivedPlanEditBlocker(
  plan: { archivedAt: Date | null },
  changes: { isActive?: boolean },
): string | null {
  return plan.archivedAt && changes.isActive === true ? 'Unarchive this plan before activating it' : null;
}
