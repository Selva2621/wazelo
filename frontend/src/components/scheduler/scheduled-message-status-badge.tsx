"use client";

import { Badge } from "@/components/ui/badge";
import type { ScheduledMessageStatus } from "@/lib/types/scheduler";

const STATUS_CONFIG: Record<
  ScheduledMessageStatus,
  {
    label: string;
    variant:
      | "default"
      | "primary"
      | "success"
      | "warning"
      | "error"
      | "info"
      | "muted";
  }
> = {
  PENDING: { label: "Pending", variant: "info" },
  QUEUED: { label: "Queued", variant: "primary" },
  SENT: { label: "Sent", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "muted" },
  FAILED: { label: "Failed", variant: "error" },
};

interface ScheduledMessageStatusBadgeProps {
  status: ScheduledMessageStatus;
}

export function ScheduledMessageStatusBadge({
  status,
}: ScheduledMessageStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
