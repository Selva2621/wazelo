"use client";

import { Badge } from "@/components/ui/badge";
import type { AutomationExecutionStatus } from "@/lib/types/automation";

const STATUS_CONFIG: Record<
  AutomationExecutionStatus,
  {
    label: string;
    variant: "default" | "primary" | "success" | "warning" | "error" | "info" | "muted";
  }
> = {
  PENDING: { label: "Pending", variant: "info" },
  RUNNING: { label: "Running", variant: "primary" },
  COMPLETED: { label: "Completed", variant: "success" },
  FAILED: { label: "Failed", variant: "error" },
  SKIPPED: { label: "Skipped", variant: "muted" },
};

interface ExecutionStatusBadgeProps {
  status: AutomationExecutionStatus;
}

export function ExecutionStatusBadge({ status }: ExecutionStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
