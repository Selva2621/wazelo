import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/** Unguessable URL-safe value (state, nonce): 32 random bytes, base64url. */
export function randomUrlSafe(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** PKCE (RFC 7636): a 43-char verifier and its S256 challenge. */
export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomUrlSafe(32);
  return { verifier, challenge: pkceChallenge(verifier) };
}

export function pkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier, 'ascii').digest('base64url');
}

/** Constant-time string comparison (false on any length mismatch or missing value). */
export function safeEqual(a: string | undefined | null, b: string | undefined | null): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
