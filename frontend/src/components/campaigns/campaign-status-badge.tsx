"use client";

import { Badge } from "@/components/ui/badge";
import type { CampaignStatus } from "@/lib/types/campaigns";

const STATUS_CONFIG: Record<
  CampaignStatus,
  { label: string; variant: "default" | "primary" | "success" | "warning" | "error" | "info" | "muted" }
> = {
  DRAFT: { label: "Draft", variant: "muted" },
  SCHEDULED: { label: "Scheduled", variant: "info" },
  RUNNING: { label: "Running", variant: "primary" },
  PAUSED: { label: "Paused", variant: "warning" },
  COMPLETED: { label: "Completed", variant: "success" },
  FAILED: { label: "Failed", variant: "error" },
  CANCELLED: { label: "Cancelled", variant: "muted" },
};

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
  pulse?: boolean;
}

export function CampaignStatusBadge({ status, pulse }: CampaignStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span className={pulse && status === "RUNNING" ? "animate-pulse" : ""}>
      <Badge variant={config.variant}>{config.label}</Badge>
    </span>
  );
}
