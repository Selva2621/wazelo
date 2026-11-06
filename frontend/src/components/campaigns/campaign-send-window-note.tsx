"use client";

import { Clock3 } from "lucide-react";

export interface SendWindow {
  startHour: number;
  endHour: number;
  timeZone: string;
}

function localHour(date: Date, timeZone: string): number | null {
  try {
    const hour = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" })
      .formatToParts(date)
      .find((p) => p.type === "hour")?.value;
    return hour === undefined ? null : Number(hour) % 24;
  } catch {
    return null;
  }
}

function hourLabel(hour: number) {
  const d = new Date(Date.UTC(2000, 0, 1, hour));
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", timeZone: "UTC" }).format(d);
}

/**
 * Next time the window opens: walk forward hour by hour (≤ 25 steps) in the
 * campaign's time zone, which also handles DST changes.
 */
export function nextSendWindowOpening(from: Date, window: SendWindow): Date | null {
  const start = new Date(from);
  start.setUTCMinutes(0, 0, 0);
  for (let i = 1; i <= 25; i++) {
    const candidate = new Date(start.getTime() + i * 3_600_000);
    if (localHour(candidate, window.timeZone) === window.startHour) return candidate;
  }
  return null;
}

export function isInsideSendWindow(date: Date, window: SendWindow): boolean {
  const hour = localHour(date, window.timeZone);
  return hour !== null && hour >= window.startHour && hour < window.endHour;
}

function formatAt(date: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

interface CampaignSendWindowNoteProps {
  window: SendWindow;
  /** Scheduled time for a scheduled campaign; otherwise now */
  reference: Date;
  scheduled: boolean;
}

/** One quiet line: sending hours, and whether the window is open (or when it opens). */
export function CampaignSendWindowNote({ window, reference, scheduled }: CampaignSendWindowNoteProps) {
  // "Send any time" campaigns: no window, only daily per-number limits
  if (window.startHour === 0 && window.endHour >= 24) {
    return (
      <p className="flex items-center gap-1.5 text-label text-on-surface-variant">
        <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Sends any time · daily limits per number</span>
      </p>
    );
  }

  const open = isInsideSendWindow(reference, window);
  const opensAt = open ? null : nextSendWindowOpening(reference, window);
  const hours = `${hourLabel(window.startHour)} – ${hourLabel(window.endHour)}`;

  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-label text-on-surface-variant">
      <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Sends {hours} ({window.timeZone})</span>
      <span aria-hidden="true">·</span>
      {open ? (
        <span>{scheduled ? "Starts inside sending hours" : "Window open"}</span>
      ) : (
        <span className="font-medium text-warning">
          {opensAt ? `Opens ${formatAt(opensAt, window.timeZone)}` : "Outside sending hours"}
        </span>
      )}
    </p>
  );
}
