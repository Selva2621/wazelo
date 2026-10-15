import { createHash, randomBytes } from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
export const RECOVERY_CODE_COUNT = 10;
export const RECOVERY_CODE_PATTERN = /^[A-Z0-9]{5}-?[A-Z0-9]{5}$/i;

/** One-time 2FA recovery codes, formatted XXXXX-XXXXX (50 bits each). Pure logic, no I/O. */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const bytes = randomBytes(10);
    const chars = Array.from(bytes, (b) => ALPHABET[b & 31]).join('');
    return `${chars.slice(0, 5)}-${chars.slice(5)}`;
  });
}

/**
 * Codes are random with 50 bits of entropy, so a fast hash is enough — no salt or
 * bcrypt needed. Input is normalised so the dash and case don't matter.
 */
export function hashRecoveryCode(code: string): string {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

export function isRecoveryCodeFormat(code: string): boolean {
  return RECOVERY_CODE_PATTERN.test(code.trim());
}
