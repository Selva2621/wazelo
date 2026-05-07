"use client";

import { Facebook, Instagram, MessageCircle } from "lucide-react";
import type { LeadAdAnalytics } from "@/lib/types/lead-ads";

interface LeadAdsPlatformBreakdownProps {
  analytics: LeadAdAnalytics;
}

const platformConfig: Record<string, { icon: typeof Facebook; color: string; accent: string }> = {
  facebook: { icon: Facebook, color: "text-[#1877F2]", accent: "border-l-[#1877F2]" },
  instagram: { icon: Instagram, color: "text-[#E4405F]", accent: "border-l-[#E4405F]" },
  whatsapp: { icon: MessageCircle, color: "text-[#25D366]", accent: "border-l-[#25D366]" },
};

export function LeadAdsPlatformBreakdown({ analytics }: LeadAdsPlatformBreakdownProps) {
  if (!analytics.byPlatform.length) return null;

  const total = analytics.totalLeads || 1;

  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5">
      <h3 className="text-[13px] font-medium text-on-surface-variant mb-4">
        Platform Breakdown
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {analytics.byPlatform.map((p) => {
          const config = platformConfig[p.platform] || platformConfig.facebook;
          const Icon = config.icon;
          const pct = ((p.count / total) * 100).toFixed(0);

          return (
            <div
              key={p.platform}
              className={`rounded-lg bg-surface-container/30 border border-outline-variant/5 border-l-2 ${config.accent} p-3`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${config.color}`} />
                <span className="text-[12px] font-medium text-on-surface capitalize">
                  {p.platform}
                </span>
              </div>
              <p className="text-[20px] font-semibold text-on-surface tabular-nums">
                {p.count.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1.5 rounded-full bg-surface-container overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500`}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: config.color === "text-[#1877F2]" ? "#1877F2" : config.color === "text-[#E4405F]" ? "#E4405F" : "#25D366",
                    }}
                  />
                </div>
                <span className="text-[11px] text-on-surface-variant tabular-nums">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
