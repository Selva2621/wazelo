/** First-response SLA for help tickets. Pure logic, no I/O. */

const HOUR_MS = 60 * 60 * 1000;

/** Hours to the first visible support reply, by priority. */
export const FIRST_RESPONSE_HOURS: Record<string, number> = {
  URGENT: 1,
  HIGH: 4,
  MEDIUM: 24,
  LOW: 48,
};

const DONE = new Set(['RESOLVED', 'CLOSED']);

export type SlaState =
  /** Answered within the target */
  | 'met'
  /** Answered, but late */
  | 'missed'
  /** Not answered yet, still inside the target */
  | 'due'
  /** Not answered and past the target */
  | 'breached'
  /** Closed/resolved without a support reply — no SLA to show */
  | 'none';

export interface TicketSla {
  dueAt: Date;
  state: SlaState;
  /** Customer spoke last (or nobody replied yet) on an open ticket */
  waitingOnSupport: boolean;
}

export function ticketSla(
  t: { priority: string; status: string; createdAt: Date; firstResponseAt: Date | null; lastReplyBy: string | null },
  now = new Date(),
): TicketSla {
  const dueAt = new Date(t.createdAt.getTime() + (FIRST_RESPONSE_HOURS[t.priority] ?? 24) * HOUR_MS);
  const open = !DONE.has(t.status);
  let state: SlaState;
  if (t.firstResponseAt) state = t.firstResponseAt <= dueAt ? 'met' : 'missed';
  else if (!open) state = 'none';
  else state = now <= dueAt ? 'due' : 'breached';
  return { dueAt, state, waitingOnSupport: open && t.lastReplyBy !== 'SUPPORT' };
}
