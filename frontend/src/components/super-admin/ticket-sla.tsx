"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { TicketSla, TicketSlaState } from "@/lib/api/super-admin";

const HOUR_MS = 60 * 60 * 1000;

/** Hours to the first visible support reply, by priority. Mirrors the backend rule. */
export const FIRST_RESPONSE_HOURS: Record<string, number> = { URGENT: 1, HIGH: 4, MEDIUM: 24, LOW: 48 };

const DONE = new Set(["RESOLVED", "CLOSED"]);

/**
 * Client copy of the server's first-response SLA, for responses that don't carry `sla`
 * (the ticket detail endpoint).
 */
export function computeTicketSla(
  t: { priority: string; status: string; createdAt: string; firstResponseAt?: string | null; lastReplyBy?: string | null },
  now = Date.now(),
): TicketSla {
  const dueAt = new Date(new Date(t.createdAt).getTime() + (FIRST_RESPONSE_HOURS[t.priority] ?? 24) * HOUR_MS);
  const open = !DONE.has(t.status);
  let state: TicketSlaState;
  if (t.firstResponseAt) state = new Date(t.firstResponseAt) <= dueAt ? "met" : "missed";
  else if (!open) state = "none";
  else state = now <= dueAt.getTime() ? "due" : "breached";
  return { dueAt: dueAt.toISOString(), state, waitingOnSupport: open && t.lastReplyBy !== "SUPPORT" };
}

/** Compact duration: "<1m", "45m", "3h 20m", "2d 4h". */
export function formatDuration(ms: number): string {
  const mins = Math.floor(Math.abs(ms) / 60_000);
  if (mins < 1) return "<1m";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    const m = mins % 60;
    return hours < 6 && m > 0 ? `${hours}h ${m}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const h = hours % 24;
  return days < 3 && h > 0 ? `${days}d ${h}h` : `${days}d`;
}

/** Current time, re-rendering every `intervalMs` so countdowns stay fresh. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Badge for the first-response SLA. A "due" SLA whose deadline passes while the page
 * is open flips to overdue without a refetch.
 */
export function TicketSlaBadge({ sla, now }: { sla: TicketSla; now: number }) {
  const due = new Date(sla.dueAt);
  const left = due.getTime() - now;
  const state = sla.state === "due" && left < 0 ? "breached" : sla.state;
  const dueLabel = `First reply due ${due.toLocaleString()}`;

  switch (state) {
    case "breached":
      return (
        <span title={dueLabel}>
          <Badge dot variant="error">Overdue by {formatDuration(left)}</Badge>
        </span>
      );
    case "due":
      return (
        <span title={dueLabel}>
          <Badge dot variant={left < HOUR_MS ? "warning" : "info"}>Reply due in {formatDuration(left)}</Badge>
        </span>
      );
    case "met":
      return <Badge dot variant="success">Replied in time</Badge>;
    case "missed":
      return <Badge dot variant="muted">Replied late</Badge>;
    default:
      return <span className="text-on-surface-variant" aria-label="No SLA">—</span>;
  }
}

/** Small marker for open tickets where the customer is waiting on support. */
export function WaitingOnUs() {
  return (
    <span className="inline-flex items-center gap-1 text-caption font-medium text-primary">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
      Waiting on us
    </span>
  );
}
