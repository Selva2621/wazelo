"use client";

import { Megaphone, CheckCheck, Eye, AlertTriangle } from "lucide-react";
import type { CampaignSummaryTotals } from "@/lib/types/analytics";

interface CampaignSummaryCardsProps {
  totals: CampaignSummaryTotals;
}

export function CampaignSummaryCards({ totals }: CampaignSummaryCardsProps) {
  const cards = [
    {
      label: "Campaigns",
      value: totals.totalCampaigns.toLocaleString(),
      rate: `${totals.completedCampaigns} completed`,
      icon: Megaphone,
      accent: "border-l-primary",
      rateColor: "text-on-surface-variant/60",
    },
    {
      label: "Delivered",
      value: totals.totalDelivered.toLocaleString(),
      rate: `${totals.avgDeliveryRate.toFixed(1)}% rate`,
      icon: CheckCheck,
      accent: "border-l-success",
      rateColor: "text-success",
    },
    {
      label: "Read",
      value: totals.totalRead.toLocaleString(),
      rate: `${totals.avgReadRate.toFixed(1)}% rate`,
      icon: Eye,
      accent: "border-l-primary",
      rateColor: "text-primary",
    },
    {
      label: "Failed",
      value: totals.totalFailed.toLocaleString(),
      rate: totals.totalSent > 0
        ? `${((totals.totalFailed / totals.totalSent) * 100).toFixed(1)}% rate`
        : "0.0% rate",
      icon: AlertTriangle,
      accent: "border-l-error",
      rateColor: "text-error",
    },
  ];

  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5">
      <h3 className="text-[13px] font-medium text-on-surface-variant mb-4">
        Campaign Summary
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-lg bg-surface-container/30 border border-outline-variant/5 border-l-2 ${card.accent} p-3`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <card.icon className="h-3.5 w-3.5 text-on-surface-variant/60" />
              <span className="text-[11px] text-on-surface-variant/60 uppercase tracking-wide">
                {card.label}
              </span>
            </div>
            <p className="text-[18px] font-semibold text-on-surface tabular-nums">
              {card.value}
            </p>
            <p className={`text-[11px] font-medium tabular-nums ${card.rateColor}`}>
              {card.rate}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
