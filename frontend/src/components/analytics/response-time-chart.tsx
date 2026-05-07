"use client";

import type { ResponseTimeSeries } from "@/lib/types/analytics";
import type { AnalyticsPeriod } from "@/lib/types/analytics";

function formatMs(ms: number): string {
  if (ms < 1000) return "<1s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  return `${minutes}m ${remainingSec}s`;
}

function formatDateLabel(dateStr: string, period: AnalyticsPeriod): string {
  const d = new Date(dateStr);
  if (period === "day") return d.toLocaleDateString(undefined, { hour: "numeric" });
  if (period === "week") return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface ResponseTimeChartProps {
  series: ResponseTimeSeries[];
  period: AnalyticsPeriod;
}

export function ResponseTimeChart({ series, period }: ResponseTimeChartProps) {
  const maxMs = Math.max(...series.map((s) => s.avgResponseTimeMs), 1);

  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5">
      <h3 className="text-[13px] font-medium text-on-surface-variant mb-4">
        Response Time
      </h3>

      {series.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-[13px] text-on-surface-variant/40">
          No data for this period
        </div>
      ) : (
        <div className="flex items-end gap-1 h-40">
          {series.map((point) => {
            const pct = (point.avgResponseTimeMs / maxMs) * 100;
            return (
              <div
                key={point.date}
                className="flex-1 flex flex-col items-center gap-1 min-w-0 group relative"
              >
                <div className="w-full flex flex-col items-stretch justify-end h-full">
                  <div className="flex-1" />
                  <div
                    className="w-full bg-success rounded-t transition-all"
                    style={{ height: `${pct}%` }}
                  />
                </div>
                {/* Hover tooltip */}
                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-surface-container p-2 rounded-lg shadow-lg text-[11px] text-on-surface whitespace-nowrap z-10">
                  <div>Avg: {formatMs(point.avgResponseTimeMs)}</div>
                  {point.p50ResponseTimeMs !== null && (
                    <div className="text-on-surface-variant/60">
                      P50: {formatMs(point.p50ResponseTimeMs)}
                    </div>
                  )}
                  {point.p95ResponseTimeMs !== null && (
                    <div className="text-on-surface-variant/60">
                      P95: {formatMs(point.p95ResponseTimeMs)}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-on-surface-variant/50 truncate w-full text-center">
                  {formatDateLabel(point.date, period)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
