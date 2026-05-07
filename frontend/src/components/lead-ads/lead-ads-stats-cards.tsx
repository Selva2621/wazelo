"use client";

import { Target, TrendingUp, Globe, Megaphone } from "lucide-react";
import type { LeadAdAnalytics } from "@/lib/types/lead-ads";

interface LeadAdsStatsCardsProps {
  analytics: LeadAdAnalytics | undefined;
  isLoading: boolean;
}

export function LeadAdsStatsCards({ analytics, isLoading }: LeadAdsStatsCardsProps) {
  const cards = [
    {
      label: "Total Leads",
      value: analytics?.totalLeads?.toLocaleString() ?? "0",
      rate: analytics
        ? `${analytics.byPlatform.reduce((s, p) => s + p.count, 0) - (analytics.totalLeads ?? 0) === 0 ? "Last 30 days" : "Last 30 days"}`
        : null,
      icon: Target,
      accent: "border-l-primary",
      rateColor: "text-on-surface-variant/60",
    },
    {
      label: "Conversion Rate",
      value: `${analytics?.conversionRate ?? 0}%`,
      rate: "Leads → Converted",
      icon: TrendingUp,
      accent:
        (analytics?.conversionRate ?? 0) >= 10
          ? "border-l-success"
          : (analytics?.conversionRate ?? 0) >= 5
            ? "border-l-warning"
            : "border-l-error",
      rateColor:
        (analytics?.conversionRate ?? 0) >= 10
          ? "text-success"
          : (analytics?.conversionRate ?? 0) >= 5
            ? "text-warning"
            : "text-error",
    },
    {
      label: "Platforms",
      value: String(analytics?.byPlatform?.length ?? 0),
      rate: analytics?.byPlatform?.map((p) => p.platform).join(", ") || null,
      icon: Globe,
      accent: "border-l-primary",
      rateColor: "text-on-surface-variant/60",
    },
    {
      label: "Campaigns",
      value: String(analytics?.byCampaign?.length ?? 0),
      rate: analytics?.byCampaign?.[0]
        ? `Top: ${analytics.byCampaign[0].campaignName}`
        : null,
      icon: Megaphone,
      accent: "border-l-primary",
      rateColor: "text-on-surface-variant/60",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl bg-surface-container-lowest border border-outline-variant/10 border-l-2 ${card.accent} p-4`}
        >
          <div className="flex items-center gap-2 mb-2">
            <card.icon className="h-4 w-4 text-on-surface-variant/60" />
            <span className="text-[11px] text-on-surface-variant/60 uppercase tracking-wide">
              {card.label}
            </span>
          </div>
          {isLoading ? (
            <div className="h-7 w-16 rounded bg-surface-container animate-pulse" />
          ) : (
            <p className="text-[22px] font-semibold text-on-surface tabular-nums">
              {card.value}
            </p>
          )}
          {card.rate && !isLoading && (
            <p className={`text-[12px] font-medium truncate ${card.rateColor}`}>
              {card.rate}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
