"use client";

import { Send, CheckCheck, Eye, AlertTriangle } from "lucide-react";

interface AnalyticsCardsProps {
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
}

export function CampaignAnalyticsCards({
  totalRecipients,
  sentCount,
  deliveredCount,
  readCount,
  failedCount,
}: AnalyticsCardsProps) {
  const deliveryRate =
    sentCount > 0 ? ((deliveredCount / sentCount) * 100).toFixed(1) : "0.0";
  const readRate =
    deliveredCount > 0 ? ((readCount / deliveredCount) * 100).toFixed(1) : "0.0";
  const failRate =
    sentCount > 0 ? ((failedCount / sentCount) * 100).toFixed(1) : "0.0";

  const cards = [
    {
      label: "Total Recipients",
      value: totalRecipients.toLocaleString(),
      rate: null,
      icon: Send,
      accent: "border-l-primary",
      rateColor: "",
    },
    {
      label: "Delivered",
      value: deliveredCount.toLocaleString(),
      rate: `${deliveryRate}%`,
      icon: CheckCheck,
      accent: "border-l-success",
      rateColor: "text-success",
    },
    {
      label: "Read",
      value: readCount.toLocaleString(),
      rate: `${readRate}%`,
      icon: Eye,
      accent: "border-l-primary",
      rateColor: "text-primary",
    },
    {
      label: "Failed",
      value: failedCount.toLocaleString(),
      rate: `${failRate}%`,
      icon: AlertTriangle,
      accent: "border-l-error",
      rateColor: "text-error",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
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
