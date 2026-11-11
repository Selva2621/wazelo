/**
 * Send failures caused by the WhatsApp connection itself (socket gone after a
 * restart, dropped mid-send, still reconnecting) rather than by the message or
 * the recipient. Nothing reached WhatsApp, so the message is safe to send again
 * once the number is back.
 *
 * "Timed out" is deliberately not here: a timed-out send may have gone through.
 */
export const CONNECTION_FAILURE_PATTERNS = [
  'no active connection',
  'session not connected',
  'whatsapp is still reconnecting',
  'connection closed',
  'connection lost',
  'worker crash',
  'whatsapp number unavailable',
] as const;

export function isConnectionFailure(reason: string | null | undefined): boolean {
  if (!reason) return false;
  const lower = reason.toLowerCase();
  return CONNECTION_FAILURE_PATTERNS.some((pattern) => lower.includes(pattern));
}
