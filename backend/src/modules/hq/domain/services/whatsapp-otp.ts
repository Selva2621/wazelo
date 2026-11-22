import { createHash, randomInt, timingSafeEqual } from 'crypto';

/**
 * Sign-up WhatsApp number check: Wazelo HQ sends a 6-digit code to the user's own
 * number (template `wazelo_verification_code`, {{1}} = the code). Optional — an
 * unverified number still works; a verified one is tagged in HQ.
 */
export const OTP_TEMPLATE = 'wazelo_verification_code';
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_SENDS_PER_DAY = 5;
export const VERIFIED_TAG = 'whatsapp-verified';

export function newOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Bound to the user, so a code (or its hash) is worthless for anyone else */
export function hashOtp(userId: string, code: string): string {
  return createHash('sha256').update(`${userId}:${code.trim()}`, 'utf8').digest('hex');
}

export function otpMatches(userId: string, code: string, storedHash: string): boolean {
  const a = Buffer.from(hashOtp(userId, code), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export type SendBlock = { reason: 'cooldown'; retryInSeconds: number } | { reason: 'daily_limit' } | null;

/** Whether another code may go out now, given the user's codes sent in the last 24 hours. */
export function canSendOtp(sentAt: Date[], now = new Date()): SendBlock {
  if (sentAt.length >= OTP_MAX_SENDS_PER_DAY) return { reason: 'daily_limit' };
  const last = sentAt.reduce<Date | null>((m, d) => (!m || d > m ? d : m), null);
  if (last && now.getTime() - last.getTime() < OTP_RESEND_COOLDOWN_MS) {
    return { reason: 'cooldown', retryInSeconds: Math.ceil((OTP_RESEND_COOLDOWN_MS - (now.getTime() - last.getTime())) / 1000) };
  }
  return null;
}
