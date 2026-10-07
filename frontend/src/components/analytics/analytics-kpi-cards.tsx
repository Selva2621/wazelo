"use client";

import {
  MessageSquare,
  Clock,
  TrendingUp,
  CheckCheck,
} from "lucide-react";
import type { DashboardOverviewResponse } from "@/lib/types/analytics";
import { StatTile, type StatTint } from "@/components/dashboard/stat-tile";

function formatMs(ms: number | null): string {
  if (ms === null || ms === 0) return "—";
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

interface AnalyticsKpiCardsProps {
  data: DashboardOverviewResponse;
  isManager: boolean;
}

export function AnalyticsKpiCards({ data, isManager }: AnalyticsKpiCardsProps) {
  const { messageVolume, responseTime, conversionFunnel } = data;

  // Delivery is only meaningful for messages we sent (inbound messages are never "delivered" by us).
  const deliveryRate =
    messageVolume.totals.sent > 0
      ? ((messageVolume.totals.delivered / messageVolume.totals.sent) * 100).toFixed(1)
      : "0.0";

  const cards = [
    {
      label: "Total Messages",
      value: messageVolume.totals.total.toLocaleString(),
      rate: `${messageVolume.totals.inbound.toLocaleString()} in / ${messageVolume.totals.outbound.toLocaleString()} out`,
      icon: MessageSquare,
      tint: "primary" as StatTint,
      tone: "muted" as const,
    },
    {
      label: "Avg Response Time",
      value: formatMs(responseTime.overall.avgResponseTimeMs),
      rate: responseTime.overall.totalResponses > 0
        ? `${responseTime.overall.totalResponses.toLocaleString()} responses`
        : null,
      icon: Clock,
      tint: "blue" as StatTint,
      tone: "muted" as const,
    },
    {
      label: isManager ? "Conversion Rate" : "Messages Sent",
      value: isManager
        ? `${conversionFunnel?.rates?.conversionRate?.toFixed(1) ?? "0.0"}%`
        : messageVolume.totals.sent.toLocaleString(),
      rate: isManager
        ? `${conversionFunnel?.snapshot?.converted ?? 0} converted`
        : null,
      icon: TrendingUp,
      tint: "green" as StatTint,
      tone: isManager ? ("success" as const) : ("muted" as const),
    },
    {
      label: "Delivered",
      value: messageVolume.totals.delivered.toLocaleString(),
      rate: `${deliveryRate}% delivery rate`,
      icon: CheckCheck,
      tint: "violet" as StatTint,
      tone: "success" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <StatTile
          key={card.label}
          label={card.label}
          value={card.value}
          icon={card.icon}
          tint={card.tint}
          detail={card.rate}
          detailTone={card.tone}
        />
      ))}
    </div>
  );
}
