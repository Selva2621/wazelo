"use client";

import { useId } from "react";

export interface DailyBarPoint {
  /** 'YYYY-MM-DD' (UTC) */
  date: string;
  value: number;
}

interface DailyBarsProps {
  title: string;
  points: DailyBarPoint[];
  /** Noun for the screen-reader label, e.g. "messages sent" */
  unit: string;
}

function dayLabel(date: string, style: "short" | "long") {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: style === "long" ? "short" : undefined,
    timeZone: "UTC",
  });
}

/**
 * Single-series daily bar chart — the day-level sibling of MonthlyBars, same anatomy:
 * one hue, no legend (the title names it), thin bars with 4px rounded tops on the
 * baseline, 2px gaps, the whole column as hover/focus target, and a table view.
 */
export function DailyBars({ title, points, unit }: DailyBarsProps) {
  const tableId = useId();
  const max = Math.max(0, ...points.map((p) => p.value));
  const total = points.reduce((sum, p) => sum + p.value, 0);
  const peak = points.find((p) => p.value === max && max > 0);
  // Roughly 6 axis labels whatever the range, always including the latest day
  const every = Math.max(1, Math.ceil(points.length / 6));

  return (
    <figure className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex flex-col gap-3 min-w-0">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-body-lg font-medium text-on-surface">{title}</span>
        <span className="text-label text-on-surface-variant tabular-nums">
          {total.toLocaleString()} in {points.length} days
        </span>
      </figcaption>

      <div className="relative">
        {peak && (
          <span className="absolute -top-0.5 right-0 text-label text-on-surface-variant tabular-nums">
            peak {peak.value.toLocaleString()}
          </span>
        )}
        <div className="flex h-28 items-end gap-[2px] pt-4 border-b border-outline-variant" role="list" aria-label={title}>
          {points.map((p) => {
            const pct = max > 0 ? (p.value / max) * 100 : 0;
            return (
              <div
                key={p.date}
                role="listitem"
                tabIndex={0}
                aria-label={`${dayLabel(p.date, "long")}: ${p.value.toLocaleString()} ${unit}`}
                className="group relative flex h-full flex-1 items-end rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <div
                  className="w-full rounded-t-[4px] bg-chart-bar transition-opacity group-hover:opacity-80"
                  // Non-zero values stay visible as a 2px sliver
                  style={{ height: p.value > 0 ? `max(2px, ${pct}%)` : 0 }}
                />
                <div
                  role="presentation"
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-outline-variant bg-surface-container-high px-2 py-1 text-label text-on-surface opacity-0 shadow-popover transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  {dayLabel(p.date, "long")} · {p.value.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex gap-[2px]" aria-hidden>
          {points.map((p, i) => (
            <span key={p.date} className="flex-1 text-center text-caption text-on-surface-variant whitespace-nowrap">
              {(points.length - 1 - i) % every === 0 ? dayLabel(p.date, "short") : ""}
            </span>
          ))}
        </div>
      </div>

      <details className="text-label text-on-surface-variant">
        <summary className="cursor-pointer select-none w-fit rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
          Show table
        </summary>
        <table id={tableId} className="mt-2 w-full text-label">
          <caption className="sr-only">{title} by day</caption>
          <thead>
            <tr className="text-left">
              <th scope="col" className="py-0.5 font-medium">Day</th>
              <th scope="col" className="py-0.5 font-medium text-right">{title}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.date}>
                <td className="py-0.5">{dayLabel(p.date, "long")}</td>
                <td className="py-0.5 text-right tabular-nums text-on-surface">{p.value.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
