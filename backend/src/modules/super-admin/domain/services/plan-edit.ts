import { AuditDiff } from './audit-diff';

/**
 * Plan fields whose edit never changes what an existing subscriber gets: labels, sale
 * status, ordering, and price/trial (locked on each subscription when it starts).
 */
const NEW_SIGNUPS_ONLY = new Set(['name', 'description', 'priceInCents', 'trialDays', 'isActive', 'sortOrder']);

/** Changed fields that would alter existing subscribers' limits or features. Pure logic. */
export function subscriberAffectingChanges(diff: AuditDiff): string[] {
  return Object.keys(diff.after).filter((key) => !NEW_SIGNUPS_ONLY.has(key));
}
