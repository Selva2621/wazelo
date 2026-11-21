"use client";

import { Clock3 } from "lucide-react";
import { hourLabel, isInsideSendWindow, nextSendWindowOpening, type SendWindow } from "@/lib/campaign-time";

export type { SendWindow };

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
