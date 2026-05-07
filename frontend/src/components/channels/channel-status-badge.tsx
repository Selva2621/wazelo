"use client";

import { Badge } from "@/components/ui/badge";
import { CHANNEL_STATUS_LABELS } from "@/lib/types/channels";
import type { ChannelStatus } from "@/lib/types/channels";

interface ChannelStatusBadgeProps {
  status: ChannelStatus;
  className?: string;
}

const statusVariant: Record<ChannelStatus, "success" | "warning" | "error" | "muted" | "info"> = {
  ACTIVE: "success",
  PENDING_SETUP: "warning",
  VERIFYING: "info",
  SUSPENDED: "error",
  ERROR: "error",
  DISCONNECTED: "muted",
};

export function ChannelStatusBadge({ status, className }: ChannelStatusBadgeProps) {
  return (
    <Badge variant={statusVariant[status]} className={className}>
      {CHANNEL_STATUS_LABELS[status]}
    </Badge>
  );
}
