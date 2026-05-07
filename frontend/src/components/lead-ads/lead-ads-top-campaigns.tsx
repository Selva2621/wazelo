"use client";

import { Megaphone } from "lucide-react";
import type { LeadAdAnalytics } from "@/lib/types/lead-ads";

interface LeadAdsTopCampaignsProps {
  analytics: LeadAdAnalytics;
}

export function LeadAdsTopCampaigns({ analytics }: LeadAdsTopCampaignsProps) {
  const campaigns = analytics.byCampaign.slice(0, 10);
  if (!campaigns.length) return null;

  const maxCount = campaigns[0]?.count || 1;

  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5">
      <h3 className="text-[13px] font-medium text-on-surface-variant mb-4">
        Top Campaigns
      </h3>
      <div className="space-y-3">
        {campaigns.map((c, i) => {
          const pct = (c.count / maxCount) * 100;
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Megaphone className="h-3.5 w-3.5 text-on-surface-variant/50 shrink-0" />
                  <span className="text-[13px] text-on-surface truncate">
                    {c.campaignName}
                  </span>
                </div>
                <span className="text-[13px] font-semibold text-primary tabular-nums ml-3">
                  {c.count}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-container overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/40 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
