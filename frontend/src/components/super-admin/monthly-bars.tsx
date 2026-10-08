"use client";

import { useId } from "react";

export interface MonthlyBarPoint {
  /** 'YYYY-MM' */
  month: string;
  value: number;
}

interface MonthlyBarsProps {
  title: string;
  points: MonthlyBarPoint[];
  /** Formats a value for labels, tooltips and the table */
  format?: (value: number) => string;
  /** Noun for the screen-reader label, e.g. "new organizations" */
  unit: string;
}

function monthLabel(month: string, style: "short" | "long") {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: style === "short" ? "short" : "long",
    year: style === "long" ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

/**
 * Single-series monthly bar chart (one hue, no legend — the title names it).
 * Thin bars, 4px rounded tops on the baseline, 2px gaps; the whole column is
 * the hover/focus target; a table view carries every value.
 */
export function MonthlyBars({ title, points, unit, format = (v) => v.toLocaleString() }: MonthlyBarsProps) {
  const tableId = useId();
  const max = Math.max(0, ...points.map((p) => p.value));
  const total = points.reduce((sum, p) => sum + p.value, 0);
  const peak = points.find((p) => p.value === max && max > 0);

  return (
    <figure className="bg-surface-container-low border border-outline-variant rounded-xl p-4 flex flex-col gap-3 min-w-0">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-body-lg font-medium text-on-surface">{title}</span>
        <span className="text-label text-on-surface-variant tabular-nums">
          {format(total)} in {points.length} mo
        </span>
      </figcaption>

      <div className="relative">
        {peak && (
          <span className="absolute -top-0.5 right-0 text-label text-on-surface-variant tabular-nums">
            peak {format(peak.value)}
          </span>
        )}
        <div className="flex h-24 items-end gap-[2px] pt-4 border-b border-outline-variant" role="list" aria-label={title}>
          {points.map((p) => {
            const pct = max > 0 ? (p.value / max) * 100 : 0;
            const label = `${monthLabel(p.month, "long")}: ${format(p.value)} ${unit}`;
            return (
              <div
                key={p.month}
                role="listitem"
                tabIndex={0}
                aria-label={label}
                className="group relative flex h-full flex-1 items-end rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                  {monthLabel(p.month, "long")} · {format(p.value)}
                </div>
              </div>
            );
          })}
        </div>
        {/* Every 3rd month, so 12 labels never collide at small widths */}
        <div className="mt-1 flex gap-[2px]" aria-hidden>
          {points.map((p, i) => (
            <span key={p.month} className="flex-1 text-center text-caption text-on-surface-variant">
              {i % 3 === (points.length - 1) % 3 ? monthLabel(p.month, "short") : ""}
            </span>
          ))}
        </div>
      </div>

      <details className="text-label text-on-surface-variant">
        <summary className="cursor-pointer select-none w-fit rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          Show table
        </summary>
        <table id={tableId} className="mt-2 w-full text-label">
          <caption className="sr-only">{title} by month</caption>
          <thead>
            <tr className="text-left">
              <th scope="col" className="py-0.5 font-medium">Month</th>
              <th scope="col" className="py-0.5 font-medium text-right">{title}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.month}>
                <td className="py-0.5">{monthLabel(p.month, "long")}</td>
                <td className="py-0.5 text-right tabular-nums text-on-surface">{format(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
