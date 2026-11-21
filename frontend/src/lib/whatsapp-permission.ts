/**
 * Lead finder WhatsApp permission: shared copy and matching for the refusal the
 * backend gives when a lead finder contact hasn't messaged you or agreed yet.
 */

/**
 * Sequence enroll refusal shown to the user. Only sequences with no email step
 * refuse; mixed sequences enroll and skip the WhatsApp steps.
 */
export const NO_WHATSAPP_PERMISSION_MESSAGE =
  "Can't add: this sequence only sends WhatsApp messages and this lead finder contact hasn't agreed to them yet. Record their permission first.";

/** Short label for counts and summaries */
export const NO_WHATSAPP_PERMISSION_SHORT = "No WhatsApp permission yet";

/**
 * True for the enroll reason code ('NO_WHATSAPP_PERMISSION') and for the backend's
 * human reason ("No WhatsApp permission: lead finder contact has not …").
 */
export function isNoWhatsAppPermissionReason(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return value === "NO_WHATSAPP_PERMISSION" || value.toLowerCase().startsWith("no whatsapp permission");
}
