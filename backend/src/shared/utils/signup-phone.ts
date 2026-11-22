import { isMobileE164, toE164 } from './phone.util';

/**
 * The WhatsApp number someone gives when they sign up, as E.164. Numbers without a
 * country code are read as Indian (sign-up has no country picker of its own yet).
 * Null when it can't be a mobile number.
 */
export function normalizeSignupPhone(raw: string | null | undefined, country = 'IN'): string | null {
  const e164 = toE164(raw, country);
  return e164 && isMobileE164(e164) ? e164 : null;
}

export const INVALID_SIGNUP_PHONE = 'Enter a valid WhatsApp number, with the country code (e.g. +91 98765 43210)';
