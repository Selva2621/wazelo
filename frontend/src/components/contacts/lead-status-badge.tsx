"use client";

import { Badge } from "@/components/ui/badge";
import type { LeadStatus } from "@/lib/types/contacts";

const statusConfig: Record<
  LeadStatus,
  { variant: "info" | "primary" | "warning" | "success" | "muted"; label: string }
> = {
  NEW: { variant: "info", label: "New" },
  CONTACTED: { variant: "primary", label: "Contacted" },
  INTERESTED: { variant: "warning", label: "Interested" },
  CONVERTED: { variant: "success", label: "Converted" },
  CLOSED: { variant: "muted", label: "Closed" },
};

interface LeadStatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.NEW;
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
