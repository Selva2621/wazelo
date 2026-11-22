/**
 * A rule's WhatsApp message failed only because the org had no connected number.
 * When a number connects again, such runs from the last RESEND_WINDOW_MS are resumed
 * once, from the step that failed (earlier steps already ran and are not repeated).
 */
export const NO_WHATSAPP_SESSION = 'NO_WHATSAPP_SESSION';

/** Older failures are left alone: a welcome a day late reads as spam */
export const RESEND_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * The step to resume from: the first failed result, when it failed for want of a
 * connected number. Each action records exactly one result, in rule order, so the
 * result's position is the action's position. Null when the run isn't resendable.
 */
export function resendFromStep(actionResults: unknown): number | null {
  if (!Array.isArray(actionResults)) return null;
  const at = actionResults.findIndex((r) => (r as { success?: unknown })?.success === false);
  if (at < 0) return null;
  const code = (actionResults[at] as { result?: { code?: unknown } })?.result?.code;
  return code === NO_WHATSAPP_SESSION ? at : null;
}
