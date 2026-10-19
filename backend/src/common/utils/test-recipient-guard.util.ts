import { Logger } from '@nestjs/common';

/**
 * Outside production, WhatsApp messages are delivered only to the numbers in
 * WHATSAPP_TEST_NUMBERS so that testing never reaches a real contact.
 *
 * - WHATSAPP_TEST_MODE: on by default unless NODE_ENV=production; "false" turns it off,
 *   "true" forces it on (e.g. staging).
 * - WHATSAPP_TEST_NUMBERS: comma-separated, any format ("+91 98765 43210", "919876543210").
 *   Empty while test mode is on means every send is blocked.
 */
const logger = new Logger('TestRecipientGuard');

export const TEST_RECIPIENT_BLOCKED_ERROR = 'not in WHATSAPP_TEST_NUMBERS';

function digitsOnly(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

/** Compare on the last 10 digits so "+919876543210" and "9876543210" match. */
function phoneKey(phone: string): string {
  return digitsOnly(phone).slice(-10);
}

function isTestModeOn(): boolean {
  const flag = process.env.WHATSAPP_TEST_MODE?.trim().toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

function allowedKeys(): Set<string> {
  return new Set(
    (process.env.WHATSAPP_TEST_NUMBERS || '')
      .split(',')
      .map(phoneKey)
      .filter((key) => key.length > 0),
  );
}

/** Returns an error message when the recipient must not be messaged, otherwise null. */
export function checkTestRecipient(recipient: string): string | null {
  if (!isTestModeOn()) return null;
  if (allowedKeys().has(phoneKey(recipient))) return null;

  const reason = `Test mode: ${recipient} is ${TEST_RECIPIENT_BLOCKED_ERROR}`;
  logger.warn(`Blocked WhatsApp send — ${reason}`);
  return reason;
}

/** Throws when the recipient must not be messaged. */
export function assertTestRecipient(recipient: string): void {
  const reason = checkTestRecipient(recipient);
  if (reason) throw new Error(reason);
}
