"use client";

import { Tooltip } from "@/components/ui/tooltip";
import type { LeadAdAnalytics } from "@/lib/types/lead-ads";

interface LeadAdsDailyChartProps {
  analytics: LeadAdAnalytics;
}

export function LeadAdsDailyChart({ analytics }: LeadAdsDailyChartProps) {
  const days = analytics.byDay;
  if (!days.length) return null;

  const maxCount = Math.max(...days.map((d) => d.count), 1);

  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5">
      <h3 className="text-[13px] font-medium text-on-surface-variant mb-4">
        Leads Over Time
      </h3>
      <div className="flex items-end gap-1 h-[100px]">
        {days.map((day) => {
          const height = Math.max((day.count / maxCount) * 100, 4);
          const date = new Date(day.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          return (
            <Tooltip
              key={day.date}
              content={`${date}: ${day.count} lead${day.count !== 1 ? "s" : ""}`}
              side="top"
            >
              <div className="flex-1 flex flex-col justify-end h-full min-w-0">
                <div
                  className="w-full rounded-t bg-primary/60 hover:bg-primary transition-colors cursor-default"
                  style={{ height: `${height}%` }}
                />
              </div>
            </Tooltip>
          );
        })}
      </div>
      {/* X-axis labels (first, middle, last) */}
      {days.length >= 3 && (
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-on-surface-variant/50">
            {new Date(days[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          <span className="text-[10px] text-on-surface-variant/50">
            {new Date(days[Math.floor(days.length / 2)].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          <span className="text-[10px] text-on-surface-variant/50">
            {new Date(days[days.length - 1].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
      )}
    </div>
  );
}
