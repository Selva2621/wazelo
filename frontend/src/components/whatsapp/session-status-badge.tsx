"use client";

import { Badge } from "@/components/ui/badge";

type SessionStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "RECONNECTING";

const statusConfig: Record<SessionStatus, { label: string; variant: "success" | "warning" | "error" | "muted" }> = {
  CONNECTED: { label: "Connected", variant: "success" },
  CONNECTING: { label: "Connecting", variant: "warning" },
  RECONNECTING: { label: "Reconnecting", variant: "warning" },
  DISCONNECTED: { label: "Disconnected", variant: "error" },
};

interface SessionStatusBadgeProps {
  status: SessionStatus;
  className?: string;
}

export function SessionStatusBadge({ status, className }: SessionStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.DISCONNECTED;

  return (
    <Badge variant={config.variant} className={className}>
      {config.variant === "success" && (
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
      )}
      {config.label}
    </Badge>
  );
}
