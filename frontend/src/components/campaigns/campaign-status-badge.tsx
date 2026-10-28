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

  // Only the dot pulses while running, so the label stays steady and readable
  return (
    <Badge variant={config.variant} dot pulse={pulse && status === "RUNNING"}>
      {config.label}
    </Badge>
  );
}
