/** Quiet Ops classes shared by the super admin list pages. */

/** The one card level: sections, chart panels, stat tiles. Never nest another inside. */
export const CARD = "rounded-2xl border border-outline-variant bg-surface-container-lowest";

/** The one card that holds a list table. */
export const TABLE_CARD = "overflow-x-auto rounded-2xl border border-outline-variant bg-surface-container-lowest";

/** "PAST_DUE" → "Past due" for filter options built from enum values. */
export function sentenceCase(value: string): string {
  const s = value.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
