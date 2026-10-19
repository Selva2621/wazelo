import { CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js/max';

/**
 * Turn whatever a user, CSV or integration gave us into E.164 ("+919876543210").
 * Numbers without a country code are read as national numbers of `country`
 * ("98765 43210", "098765 43210" → +91…). Returns null when it can't be a phone number.
 */
export function toE164(raw: string | null | undefined, country: string): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim().replace(/^00/, '+');

  const national = parsePhoneNumberFromString(trimmed, country as CountryCode);
  if (national?.isValid()) return national.number;

  // Already international but missing the "+" ("971501234567" in an Indian org)
  if (!trimmed.startsWith('+')) {
    const international = parsePhoneNumberFromString(`+${trimmed.replace(/\D/g, '')}`);
    if (international?.isValid()) return international.number;
  }

  // Right length but not a real allocated range (test numbers) — keep it, normalized
  return national?.isPossible() ? national.number : null;
}

/** True for mobile numbers, the only ones that can be on WhatsApp. Unknown types count as mobile. */
export function isMobileE164(phone: string): boolean {
  const type = parsePhoneNumberFromString(phone)?.getType();
  return type === undefined || type === 'MOBILE' || type === 'FIXED_LINE_OR_MOBILE';
}
