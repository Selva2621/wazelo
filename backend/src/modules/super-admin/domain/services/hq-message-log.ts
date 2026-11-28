/**
 * Super admin "Message log": every WhatsApp message sent from Wazelo HQ's number
 * (QR session or Cloud API), shown as stored. Codes are already wiped in the database
 * once sent (shared/utils/message-redaction), so nothing is masked here. Pure logic.
 */

/** What a message was for, from `metadata.platformAlert` ("other": chats, campaigns…) */
export const HQ_MESSAGE_KINDS = [
  'login_code',
  'verification_code',
  'trial_ending',
  'trial_expired',
  'renewal_due',
  'grace_period',
  'payment_failed',
  'whatsapp_disconnected',
] as const;

export type HqMessageKind = (typeof HQ_MESSAGE_KINDS)[number] | 'other';

export function hqMessageKind(metadata: unknown): HqMessageKind {
  const alert = (metadata as { platformAlert?: unknown } | null)?.platformAlert;
  return typeof alert === 'string' && (HQ_MESSAGE_KINDS as readonly string[]).includes(alert)
    ? (alert as HqMessageKind)
    : 'other';
}

/** A bare date (YYYY-MM-DD) as `to` means "through the end of that day" */
export function logRangeEnd(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T23:59:59.999Z`) : new Date(value);
}

export interface HqMessageRow {
  id: string;
  status: string;
  contactPhone: string;
  /** Already decrypted */
  body: string | null;
  metadata: unknown;
  failedReason: string | null;
  retryCount: number;
  createdAt: Date;
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  session: { provider: string; phoneNumber: string | null } | null;
}

/** One row of the log */
export function toHqMessageLogEntry(row: HqMessageRow) {
  return {
    id: row.id,
    kind: hqMessageKind(row.metadata),
    status: row.status,
    to: row.contactPhone,
    body: row.body,
    failedReason: row.failedReason,
    retryCount: row.retryCount,
    /** QR session or official Cloud API number (null if the number was removed) */
    via: row.session?.provider ?? null,
    from: row.session?.phoneNumber ?? null,
    createdAt: row.createdAt,
    sentAt: row.sentAt,
    deliveredAt: row.deliveredAt,
    readAt: row.readAt,
  };
}
