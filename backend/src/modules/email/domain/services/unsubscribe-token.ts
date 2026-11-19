import { createHmac, timingSafeEqual } from 'crypto';

/**
 * The link in every email's "Unsubscribe": who (org + contact) signed with the
 * server secret, so nobody can unsubscribe someone else by guessing ids.
 */
export function signUnsubscribe(orgId: string, contactId: string, secret: string): string {
  const payload = Buffer.from(`${orgId}.${contactId}`).toString('base64url');
  return `${payload}.${mac(payload, secret)}`;
}

/** The org and contact in a valid token, or null */
export function readUnsubscribe(token: string, secret: string): { orgId: string; contactId: string } | null {
  const [payload, sig] = (token ?? '').split('.');
  if (!payload || !sig) return null;
  const expected = mac(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [orgId, contactId] = Buffer.from(payload, 'base64url').toString('utf8').split('.');
  return orgId && contactId ? { orgId, contactId } : null;
}

function mac(payload: string, secret: string): string {
  return createHmac('sha256', `email-unsubscribe:${secret}`).update(payload).digest('base64url');
}
