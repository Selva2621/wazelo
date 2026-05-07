"use client";

import {
  MessageSquare,
  Clock,
  TrendingUp,
  CheckCheck,
} from "lucide-react";
import type { DashboardOverviewResponse } from "@/lib/types/analytics";

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

  const deliveryRate =
    messageVolume.totals.total > 0
      ? ((messageVolume.totals.delivered / messageVolume.totals.total) * 100).toFixed(1)
      : "0.0";

  const cards = [
    {
      label: "Total Messages",
      value: messageVolume.totals.total.toLocaleString(),
      rate: `${messageVolume.totals.inbound.toLocaleString()} in / ${messageVolume.totals.outbound.toLocaleString()} out`,
      icon: MessageSquare,
      accent: "border-l-primary",
      rateColor: "text-on-surface-variant/60",
    },
    {
      label: "Avg Response Time",
      value: formatMs(responseTime.overall.avgResponseTimeMs),
      rate: responseTime.overall.totalResponses > 0
        ? `${responseTime.overall.totalResponses.toLocaleString()} responses`
        : null,
      icon: Clock,
      accent: "border-l-success",
      rateColor: "text-on-surface-variant/60",
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
      accent: "border-l-warning",
      rateColor: isManager ? "text-success" : "text-on-surface-variant/60",
    },
    {
      label: "Delivered",
      value: messageVolume.totals.delivered.toLocaleString(),
      rate: `${deliveryRate}% delivery rate`,
      icon: CheckCheck,
      accent: "border-l-primary",
      rateColor: "text-success",
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
          <p className="text-[22px] font-semibold text-on-surface tabular-nums">
            {card.value}
          </p>
          {card.rate && (
            <p className={`text-[12px] font-medium tabular-nums ${card.rateColor}`}>
              {card.rate}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
