"use client";

import type { PeakHoursResponse } from "@/lib/types/analytics";

function formatHour(hour: number): string {
  if (hour === 0) return "12a";
  if (hour < 12) return `${hour}a`;
  if (hour === 12) return "12p";
  return `${hour - 12}p`;
}

interface PeakHoursChartProps {
  data: PeakHoursResponse;
}

export function PeakHoursChart({ data }: PeakHoursChartProps) {
  const { hours, peakHour, quietHour } = data;
  const maxTotal = Math.max(...hours.map((h) => h.total), 1);

  return (
    <div className="rounded-xl bg-surface-container-lowest p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-title-sm font-semibold text-on-surface">
          Peak Hours
        </h3>
        <span className="text-caption text-on-surface-variant">
          Peak: {formatHour(peakHour)} · Quiet: {formatHour(quietHour)}
        </span>
      </div>

      <div className="flex items-stretch gap-[2px] h-32">
        {hours.map((entry) => {
          const pct = (entry.total / maxTotal) * 100;
          const isPeak = entry.hour === peakHour;
          const isQuiet = entry.hour === quietHour;

          let barColor = "bg-surface-container-high";
          if (isPeak) barColor = "bg-primary";
          else if (isQuiet) barColor = "bg-error/30";
          else if (pct > 50) barColor = "bg-primary/50";
          else if (pct > 25) barColor = "bg-primary/30";

          return (
            <div
              key={entry.hour}
              className="flex-1 flex flex-col items-center gap-0.5 min-w-0 group relative"
            >
              <div className="w-full flex flex-col justify-end flex-1 min-h-0">
                <div
                  className={`w-full rounded-t ${barColor} transition-all`}
                  style={{ height: `${Math.max(pct, 2)}%` }}
                />
              </div>
              {/* Label every 3 hours; every column reserves the slot so bar bases align */}
              <span className="h-4 text-caption font-normal whitespace-nowrap text-on-surface-variant">
                {entry.hour % 3 === 0 ? formatHour(entry.hour) : null}
              </span>
              {/* Hover tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-surface-container p-1.5 rounded-lg shadow-lg text-caption text-on-surface whitespace-nowrap z-10">
                {formatHour(entry.hour)}: {entry.total.toLocaleString()} msgs
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
