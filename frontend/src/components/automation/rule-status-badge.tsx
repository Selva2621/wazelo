"use client";

import { Badge } from "@/components/ui/badge";
import type { AutomationRuleStatus } from "@/lib/types/automation";

const STATUS_CONFIG: Record<
  AutomationRuleStatus,
  {
    label: string;
    variant: "default" | "primary" | "success" | "warning" | "error" | "info" | "muted";
  }
> = {
  ACTIVE: { label: "Active", variant: "success" },
  INACTIVE: { label: "Inactive", variant: "muted" },
};

interface RuleStatusBadgeProps {
  status: AutomationRuleStatus;
}

export function RuleStatusBadge({ status }: RuleStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
