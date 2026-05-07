"use client";

import type { SlaPolicy, SlaPerformanceResponse } from "@/lib/types/sla";

function formatMs(ms: number): string {
  if (ms < 1000) return "<1s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSec}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  return `${hours}h ${remainingMin}m`;
}

interface SlaResponseChartProps {
  performance: SlaPerformanceResponse;
  policies: SlaPolicy[];
}

export function SlaResponseChart({
  performance,
  policies,
}: SlaResponseChartProps) {
  const { avgResponseByUser } = performance;

  // Find the main first-response policy threshold for the reference line
  const firstResponsePolicy = policies.find(
    (p) => p.metricType === "FIRST_RESPONSE_TIME" && p.isActive,
  );
  const thresholdMs = firstResponsePolicy?.thresholdMs ?? null;
  const warningMs = firstResponsePolicy?.warningThresholdMs ?? null;

  if (avgResponseByUser.length === 0) {
    return (
      <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5">
        <h3 className="text-[13px] font-medium text-on-surface-variant mb-4">
          Response Time vs SLA
        </h3>
        <div className="h-40 flex items-center justify-center text-[13px] text-on-surface-variant/40">
          No response data for this period
        </div>
      </div>
    );
  }

  const maxMs = Math.max(
    ...avgResponseByUser.map((u) => u.avgMs),
    thresholdMs ?? 0,
  );

  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5">
      <h3 className="text-[13px] font-medium text-on-surface-variant mb-4">
        Response Time vs SLA
      </h3>

      <div className="relative flex items-end gap-2 h-40">
        {/* Threshold reference line */}
        {thresholdMs && (
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-error/40 z-10"
            style={{ bottom: `${(thresholdMs / maxMs) * 100}%` }}
          >
            <span className="absolute -top-4 right-0 text-[10px] text-error/60">
              SLA: {formatMs(thresholdMs)}
            </span>
          </div>
        )}

        {/* Warning reference line */}
        {warningMs && (
          <div
            className="absolute left-0 right-0 border-t border-dashed border-warning/30 z-10"
            style={{ bottom: `${(warningMs / maxMs) * 100}%` }}
          >
            <span className="absolute -top-4 right-0 text-[10px] text-warning/50">
              Warn: {formatMs(warningMs)}
            </span>
          </div>
        )}

        {avgResponseByUser.map((user) => {
          const pct = maxMs > 0 ? (user.avgMs / maxMs) * 100 : 0;
          const isBreaching = thresholdMs ? user.avgMs > thresholdMs : false;
          const isWarning =
            warningMs && !isBreaching ? user.avgMs > warningMs : false;

          const barColor = isBreaching
            ? "bg-error"
            : isWarning
              ? "bg-warning"
              : "bg-success";

          return (
            <div
              key={user.assignedUserId}
              className="flex-1 flex flex-col items-center gap-1 min-w-0 group relative"
            >
              <div className="w-full flex flex-col items-stretch justify-end h-full">
                <div className="flex-1" />
                <div
                  className={`w-full ${barColor} rounded-t transition-all`}
                  style={{ height: `${pct}%` }}
                />
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-surface-container p-2 rounded-lg shadow-lg text-[11px] text-on-surface whitespace-nowrap z-20">
                <div>Avg: {formatMs(user.avgMs)}</div>
                <div className="text-on-surface-variant/60">
                  {user.count} conversation{user.count !== 1 ? "s" : ""}
                </div>
              </div>
              <span className="text-[10px] text-on-surface-variant/50 truncate w-full text-center">
                {user.assignedUserId.slice(0, 6)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-on-surface-variant/50">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-success" /> Within SLA
        </span>
        {warningMs && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning" /> Warning
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-error" /> Breached
        </span>
      </div>
    </div>
  );
}
