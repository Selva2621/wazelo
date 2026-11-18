"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { CityInsightsResponse } from "@/lib/types/analytics";
import { formatMinutes, hourLabel, REPLY_WORD, replyLevel } from "./city-config";
import { hourTotals } from "./hour-skyline";
import { useCityStore } from "./use-city-store";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("en-IN");

const LEVEL_DOT = { fast: "bg-success", ok: "bg-warning", slow: "bg-error", none: "bg-outline" } as const;

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-2.5 first:pl-0 last:pr-0 [&+&]:border-l [&+&]:border-outline-variant/50">
      <p className="truncate text-caption text-on-surface-variant">{label}</p>
      <div className="mt-0.5 flex items-baseline gap-1.5 whitespace-nowrap text-title-sm font-semibold tabular-nums text-on-surface">
        {children}
      </div>
    </div>
  );
}

/** Change vs yesterday at the same time: arrow + words, colour only as a secondary cue */
function Delta({ today, yesterday }: { today: number; yesterday: number }) {
  if (!yesterday) {
    return <span className="text-caption font-normal text-on-surface-variant">{today ? "new today" : "quiet so far"}</span>;
  }
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  const Icon = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-caption font-medium",
        pct > 0 ? "text-success" : pct < 0 ? "text-error" : "text-on-surface-variant",
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {pct === 0 ? "same as yesterday" : `${Math.abs(pct)}% vs yesterday`}
    </span>
  );
}

/** Live numbers across the top of the town, the timeline legend/tooltip, and the event feed. */
export function CityHud({
  insights,
  waiting,
  leadsToday,
}: {
  insights: CityInsightsResponse | undefined;
  waiting: number;
  leadsToday: number;
}) {
  const hoveredHour = useCityStore((s) => s.hoveredHour);
  const events = useCityStore((s) => s.events);
  // Re-render the "x min ago" labels every 30 s
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const level = replyLevel(insights?.replyMinutes);
  const hour = hoveredHour !== null && insights ? hourTotals(insights, hoveredHour) : null;

  return (
    <>
      {/* HUD: today's numbers */}
      <div
        data-tour="city-hud"
        className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2"
      >
        <div className="flex min-w-0 flex-wrap rounded-xl border border-outline-variant/40 bg-surface-container-lowest/85 px-4 shadow-sm backdrop-blur-md">
          <Stat label="Messages today">
            {fmt(insights?.totalToday ?? 0)}
            {insights && <Delta today={insights.totalToday} yesterday={insights.totalYesterdaySameTime} />}
          </Stat>
          <Stat label="Avg first reply">
            <span className={cn("size-2 self-center rounded-full", LEVEL_DOT[level])} aria-hidden />
            {insights?.replyMinutes != null ? formatMinutes(insights.replyMinutes) : "—"}
            <span className="text-caption font-normal text-on-surface-variant">{REPLY_WORD[level]}</span>
          </Stat>
          <Stat label="Waiting 15+ min">
            <span className={waiting ? "text-error" : undefined}>{fmt(waiting)}</span>
          </Stat>
          <Stat label="Leads today">{fmt(leadsToday)}</Stat>
        </div>

        {/* Right column: timeline legend (or the hovered hour), then the live feed */}
        <div className="flex w-64 flex-col items-stretch gap-2 self-start">
        <div
          className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/85 px-3 py-2 text-caption text-on-surface-variant shadow-sm backdrop-blur-md"
          aria-live="polite"
        >
          {hour && hoveredHour !== null ? (
            <span className="tabular-nums">
              <span className="font-semibold text-on-surface">{hourLabel(hoveredHour)}</span> ·{" "}
              <span className="font-medium text-on-surface">{fmt(hour.today)}</span> today ·{" "}
              {fmt(hour.yesterday)} yesterday
            </span>
          ) : (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Per hour, front edge</span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2 rounded-sm bg-primary" aria-hidden /> Today
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2 rounded-sm bg-on-surface/25" aria-hidden /> Yesterday
              </span>
            </span>
          )}
        </div>

      {/* Live feed */}
      {events.length > 0 && (
        <ol
          data-tour="city-feed"
          aria-label="Live activity"
          aria-live="polite"
          className="space-y-1"
        >
          {events.map((e, i) => (
            <li
              key={e.id}
              className="rise-in flex items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest/85 px-2.5 py-1.5 text-label text-on-surface shadow-sm backdrop-blur-md"
              style={{ opacity: 1 - i * 0.13 }}
            >
              <span className="size-2 shrink-0 rounded-full" style={{ background: e.color }} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{e.text}</span>
              <span className="shrink-0 tabular-nums text-caption text-on-surface-variant">{ago(e.at)}</span>
            </li>
          ))}
        </ol>
      )}
        </div>
      </div>
    </>
  );
}

function ago(at: number) {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 45) return "now";
  const m = Math.round(s / 60);
  return m < 60 ? `${m}m` : `${Math.round(m / 60)}h`;
}
