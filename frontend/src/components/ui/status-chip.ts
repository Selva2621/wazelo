/**
 * Header status chip (AI credits + WhatsApp health). Each segment is neutral while healthy and
 * tinted only when it needs attention, so the header never competes with the page.
 */
export const statusChipSegment =
  "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-label font-medium transition-colors duration-120 ease-standard outline-none focus-visible:ring-2 focus-visible:ring-focus";

export const statusChipTone = {
  ok: "text-on-surface-variant hover:bg-surface-container hover:text-on-surface [&>svg]:text-success",
  warning: "bg-warning-container text-warning hover:opacity-85",
  error: "bg-error-container text-error hover:opacity-85",
} as const;

export type StatusChipTone = keyof typeof statusChipTone;
