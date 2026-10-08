"use client";

import type { MessageVolumeSeries } from "@/lib/types/analytics";
import type { AnalyticsPeriod } from "@/lib/types/analytics";

function formatDateLabel(dateStr: string, period: AnalyticsPeriod): string {
  const d = new Date(dateStr);
  if (period === "day") return d.toLocaleDateString(undefined, { hour: "numeric" });
  if (period === "week") return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface MessageVolumeChartProps {
  series: MessageVolumeSeries[];
  period: AnalyticsPeriod;
}

export function MessageVolumeChart({ series, period }: MessageVolumeChartProps) {
  const maxTotal = Math.max(...series.map((s) => s.total), 1);

  return (
    <div className="rounded-xl bg-surface-container-lowest p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-title-sm font-semibold text-on-surface">
          Message Volume
        </h3>
        <div className="flex items-center gap-3 text-caption text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-primary" />
            Outbound
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-primary/40" />
            Inbound
          </span>
        </div>
      </div>

      {series.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-body text-on-surface-variant">
          No data for this period
        </div>
      ) : (
        <div className="flex items-stretch gap-1 h-40">
          {series.map((point) => {
            const outPct = (point.outbound / maxTotal) * 100;
            const inPct = (point.inbound / maxTotal) * 100;
            return (
              <div
                key={point.date}
                className="flex-1 flex flex-col items-center gap-1 min-w-0 group"
              >
                <div className="w-full flex flex-col items-stretch justify-end flex-1 min-h-0">
                  <div className="flex-1" />
                  <div
                    className="w-full bg-primary/40 rounded-t transition-all"
                    style={{ height: `${inPct}%` }}
                  />
                  <div
                    className="w-full bg-primary transition-all"
                    style={{ height: `${outPct}%` }}
                  />
                </div>
                <span className="text-caption text-on-surface-variant truncate w-full text-center">
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
