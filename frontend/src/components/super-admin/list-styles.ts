/** Quiet Ops classes shared by the super admin list pages. */

/** The one card level: sections, chart panels, stat tiles. Never nest another inside. */
export const CARD = "rounded-2xl border border-outline-variant bg-surface-container-lowest";

/** The one card that holds a list table. */
export const TABLE_CARD = "overflow-x-auto rounded-2xl border border-outline-variant bg-surface-container-lowest";

/** Plain column header, matching the shared table's head cells. */
export const TH = "h-10 px-4 text-left text-label font-medium whitespace-nowrap text-on-surface-variant";

/** Body row hover, matching the shared table. */
export const TR = "transition-colors duration-120 ease-standard hover:bg-surface-container-low";

/** "PAST_DUE" → "Past due" for filter options built from enum values. */
export function sentenceCase(value: string): string {
  const s = value.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
