"use client";

import { Megaphone, CheckCheck, Eye, AlertTriangle } from "lucide-react";
import type { CampaignSummaryTotals } from "@/lib/types/analytics";
import { StatTile, type StatTint } from "@/components/dashboard/stat-tile";

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
      tint: "primary" as StatTint,
      tone: "muted" as const,
    },
    {
      label: "Delivered",
      value: totals.totalDelivered.toLocaleString(),
      rate: `${totals.avgDeliveryRate.toFixed(1)}% rate`,
      icon: CheckCheck,
      tint: "green" as StatTint,
      tone: "success" as const,
    },
    {
      label: "Read",
      value: totals.totalRead.toLocaleString(),
      rate: `${totals.avgReadRate.toFixed(1)}% rate`,
      icon: Eye,
      tint: "blue" as StatTint,
      tone: "muted" as const,
    },
    {
      label: "Failed",
      value: totals.totalFailed.toLocaleString(),
      rate: totals.totalSent > 0
        ? `${((totals.totalFailed / totals.totalSent) * 100).toFixed(1)}% rate`
        : "0.0% rate",
      icon: AlertTriangle,
      tint: "red" as StatTint,
      tone: "error" as const,
    },
  ];

  return (
    <div className="rounded-xl bg-surface-container-lowest p-5">
      <h3 className="mb-4 text-title-sm font-semibold text-on-surface">Campaign summary</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatTile
            key={card.label}
            variant="inset"
            label={card.label}
            value={card.value}
            icon={card.icon}
            tint={card.tint}
            detail={card.rate}
            detailTone={card.tone}
          />
        ))}
      </div>
    </div>
  );
}
