import { Logger } from '@nestjs/common';
import { toE164 } from '@/shared/utils/phone.util';

/**
 * Outside production, every WhatsApp message goes to a number in WHATSAPP_TEST_NUMBERS
 * so testing never reaches a real contact. Sends to a test number go through as is;
 * sends to anyone else are redirected to the first test number — campaigns, inbox
 * replies and automations all run (and show as sent) exactly as they would live.
 *
 * - WHATSAPP_TEST_MODE: on by default unless NODE_ENV=production; "false" turns it off,
 *   "true" forces it on (e.g. staging).
 * - WHATSAPP_TEST_NUMBERS: comma-separated, any format ("+91 98765 43210", "9876543210" —
 *   10 digits are read as Indian). Empty while test mode is on means every send fails.
 */
const logger = new Logger('TestRecipientGuard');

export const TEST_RECIPIENT_BLOCKED_ERROR = 'WHATSAPP_TEST_NUMBERS is empty';

/** Compare on the last 10 digits so "+919876543210" and "9876543210" match. */
function phoneKey(phone: string): string {
  return phone.replace(/[^0-9]/g, '').slice(-10);
}

export function isTestModeOn(): boolean {
  const flag = process.env.WHATSAPP_TEST_MODE?.trim().toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

/** Test numbers in E.164, in the order listed */
function testNumbers(): string[] {
  return (process.env.WHATSAPP_TEST_NUMBERS || '')
    .split(',')
    .map((raw) => raw.trim() && toE164(raw, 'IN'))
    .filter((n): n is string => !!n);
}

/**
 * Who a message to `recipient` should really go to: the recipient itself outside test
 * mode or when it is a test number, else the first test number. Null when test mode is
 * on with no test numbers — nowhere safe to send.
 */
export function resolveTestRecipient(recipient: string): string | null {
  if (!isTestModeOn()) return recipient;

  const numbers = testNumbers();
  if (numbers.length === 0) {
    logger.warn(`Blocked WhatsApp send to ${recipient} — test mode is on and ${TEST_RECIPIENT_BLOCKED_ERROR}`);
    return null;
  }

  const key = phoneKey(recipient);
  if (numbers.some((n) => phoneKey(n) === key)) return recipient;

  logger.log(`Test mode: WhatsApp send to ${recipient} redirected to ${numbers[0]}`);
  return numbers[0];
}

/** Like resolveTestRecipient, but throws instead of returning null. */
export function testRecipientOrThrow(recipient: string): string {
  const to = resolveTestRecipient(recipient);
  if (!to) throw new Error(`Test mode: ${TEST_RECIPIENT_BLOCKED_ERROR}`);
  return to;
}
