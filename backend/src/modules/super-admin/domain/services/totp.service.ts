import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

/**
 * RFC 6238 TOTP (HMAC-SHA1, 30s step, 6 digits) — the scheme used by
 * Google Authenticator, 1Password, Authy, etc. Pure logic, no I/O.
 */
@Injectable()
export class TotpService {
  /** 160-bit random secret, base32-encoded (RFC 4226 recommended length). */
  generateSecret(): string {
    return base32Encode(randomBytes(20));
  }

  buildOtpAuthUrl(secret: string, accountName: string, issuer = 'Wazelo Admin'): string {
    const label = encodeURIComponent(`${issuer}:${accountName}`);
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: 'SHA1',
      digits: String(DIGITS),
      period: String(STEP_SECONDS),
    });
    return `otpauth://totp/${label}?${params.toString()}`;
  }

  /**
   * Verify a code, allowing ±`window` steps of clock drift.
   * Comparison is constant-time.
   */
  verify(secret: string, code: string, window = 1, now = Date.now()): boolean {
    const normalized = (code ?? '').replace(/\s/g, '');
    if (!/^\d{6}$/.test(normalized)) return false;

    const key = base32Decode(secret);
    const currentStep = Math.floor(now / 1000 / STEP_SECONDS);
    const given = Buffer.from(normalized);

    let matched = false;
    for (let offset = -window; offset <= window; offset++) {
      const expected = Buffer.from(hotp(key, currentStep + offset));
      // Evaluate every step — no early return — to keep timing uniform
      if (timingSafeEqual(expected, given)) matched = true;
    }
    return matched;
  }

  /** Exposed for tests: the code for a given time. */
  generate(secret: string, now = Date.now()): string {
    return hotp(base32Decode(secret), Math.floor(now / 1000 / STEP_SECONDS));
  }
}

function hotp(key: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error('Invalid base32 character');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
