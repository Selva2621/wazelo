import { createHash, randomBytes } from 'crypto';

/**
 * One-time code a super admin uses to open Wazelo HQ in the tenant app. Issued by the
 * super admin portal, exchanged once by /auth/hq/exchange for a normal tenant session.
 * Only its SHA-256 is stored.
 */
export const HQ_HANDOFF_TTL_MS = 60_000;

export function newHqHandoffCode(): string {
  return randomBytes(32).toString('base64url');
}

export function hashHqHandoffCode(code: string): string {
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

/**
 * A page inside the tenant app to land on after opening HQ ("/inbox", "/campaigns?x=1").
 * Only same-app paths: no scheme, no "//host", no backslashes. Anything else → null.
 */
export function safeHqPath(next: string | null | undefined): string | null {
  if (!next || next.length > 200) return null;
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\') || /[\s:]/.test(next.split('?')[0])) return null;
  return next;
}

/** Tenant page that exchanges the code. In the fragment so it never reaches server logs or a Referer. */
export function hqHandoffUrl(frontendUrl: string, code: string, next?: string | null): string {
  const path = safeHqPath(next);
  return `${frontendUrl.replace(/\/$/, '')}/auth/hq#code=${encodeURIComponent(code)}${path ? `&next=${encodeURIComponent(path)}` : ''}`;
}
