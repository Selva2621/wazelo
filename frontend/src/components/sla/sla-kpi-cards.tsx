"use client";

import { ShieldCheck, Clock, AlertTriangle, Activity } from "lucide-react";
import type { SlaPerformanceResponse } from "@/lib/types/sla";

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

interface SlaKpiCardsProps {
  data: SlaPerformanceResponse;
  activeBreaches: number;
}

export function SlaKpiCards({ data, activeBreaches }: SlaKpiCardsProps) {
  const { compliance, avgResponseByUser } = data;

  const totalAvgMs =
    avgResponseByUser.length > 0
      ? Math.round(
          avgResponseByUser.reduce((sum, u) => sum + u.avgMs * u.count, 0) /
            avgResponseByUser.reduce((sum, u) => sum + u.count, 0),
        )
      : null;

  const cards = [
    {
      label: "SLA compliance",
      value: `${compliance.complianceRate.toFixed(1)}%`,
      rate: `${compliance.total - compliance.breached} / ${compliance.total} within SLA`,
      icon: ShieldCheck,
      accent: "max-lg:border-l-success",
      rateColor:
        compliance.complianceRate >= 90
          ? "text-success"
          : compliance.complianceRate >= 70
            ? "text-warning"
            : "text-error",
    },
    {
      label: "Avg response time",
      value: formatMs(totalAvgMs),
      rate: avgResponseByUser.length > 0
        ? `Across ${avgResponseByUser.reduce((s, u) => s + u.count, 0)} conversations`
        : null,
      icon: Clock,
      accent: "max-lg:border-l-primary",
      rateColor: "text-on-surface-variant/60",
    },
    {
      label: "Active breaches",
      value: activeBreaches.toString(),
      rate:
        activeBreaches === 0
          ? "All clear"
          : activeBreaches === 1
            ? "1 breach needs attention"
            : `${activeBreaches} breaches need attention`,
      icon: AlertTriangle,
      accent: "max-lg:border-l-error",
      rateColor: activeBreaches === 0 ? "text-success" : "text-error",
    },
    {
      label: "Tracked conversations",
      value: compliance.total.toLocaleString(),
      rate: `${compliance.breached} breached`,
      icon: Activity,
      accent: "max-lg:border-l-warning",
      rateColor:
        compliance.breached === 0 ? "text-success" : "text-on-surface-variant/60",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          // Desktop: plain card, numbers only; phones keep the coloured edge and icon to scan by
          className={`rounded-2xl bg-surface-container-lowest border border-outline-variant p-4 max-lg:rounded-xl max-lg:border-outline-variant/10 max-lg:border-l-2 ${card.accent}`}
        >
          <div className="flex items-center gap-2 mb-2 lg:mb-1">
            <card.icon className="h-4 w-4 text-on-surface-variant/60 lg:hidden" />
            <span className="text-label text-on-surface-variant max-lg:text-caption max-lg:uppercase max-lg:tracking-wide max-lg:text-on-surface-variant/60">
              {card.label}
            </span>
          </div>
          <p className="text-headline font-semibold text-on-surface tabular-nums">
            {card.value}
          </p>
          {card.rate && (
            <p
              className={`text-label font-medium tabular-nums ${card.rateColor}`}
            >
              {card.rate}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
