"use client";

import type { ConversionFunnelResponse } from "@/lib/types/analytics";

const STAGES = [
  { key: "new" as const, label: "New", color: "bg-primary/30" },
  { key: "contacted" as const, label: "Contacted", color: "bg-primary/50" },
  { key: "interested" as const, label: "Interested", color: "bg-primary/70" },
  { key: "converted" as const, label: "Converted", color: "bg-success" },
  { key: "closed" as const, label: "Closed", color: "bg-on-surface-variant/30" },
];

interface ConversionFunnelProps {
  data: ConversionFunnelResponse;
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  const { snapshot, rates } = data;
  const maxCount = Math.max(
    snapshot.new,
    snapshot.contacted,
    snapshot.interested,
    snapshot.converted,
    snapshot.closed,
    1,
  );

  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-medium text-on-surface-variant">
          Conversion Funnel
        </h3>
        <span className="text-[12px] font-medium text-success tabular-nums">
          {rates.conversionRate.toFixed(1)}% conversion
        </span>
      </div>

      <div className="space-y-2.5">
        {STAGES.map((stage) => {
          const count = snapshot[stage.key];
          const pct = (count / maxCount) * 100;
          return (
            <div key={stage.key} className="flex items-center gap-3">
              <span className="w-20 text-[12px] text-on-surface-variant shrink-0">
                {stage.label}
              </span>
              <div className="flex-1 h-7 bg-surface-container rounded overflow-hidden">
                <div
                  className={`h-full rounded ${stage.color} transition-all`}
                  style={{ width: `${Math.max(pct, 1)}%` }}
                />
              </div>
              <span className="w-14 text-right text-[12px] tabular-nums text-on-surface shrink-0">
                {count.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
