"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":");
}

interface CampaignElapsedTimerProps {
  /** Active time the server measured, as of `asOf` */
  elapsedMs: number;
  asOf: string;
  /** Only a running campaign keeps counting */
  running: boolean;
}

/**
 * Run time for a campaign. Ticks once a second only while running, inside this
 * small component, so the rest of the page doesn't re-render every second.
 */
export function CampaignElapsedTimer({ elapsedMs, asOf, running }: CampaignElapsedTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, [running]);

  const shown = elapsedMs + (running ? Math.max(0, now - new Date(asOf).getTime()) : 0);

  return (
    <span className="inline-flex items-center gap-1.5 text-label text-on-surface-variant">
      <Timer className="h-4 w-4" aria-hidden="true" />
      <span>{running ? "Elapsed" : "Run time"}</span>
      {/* Not live: a screen reader shouldn't announce every second */}
      <span className="font-mono font-medium tabular-nums text-on-surface">
        {formatElapsed(shown)}
      </span>
    </span>
  );
}
