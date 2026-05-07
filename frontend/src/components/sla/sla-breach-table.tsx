"use client";

import { AlertTriangle, CheckCircle, Eye } from "lucide-react";
import type { SlaBreachLog, SlaPolicy } from "@/lib/types/sla";
import {
  Table,
  TableHeader,
  TableHeaderRow,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";

function formatMs(ms: number): string {
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

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const statusConfig = {
  ACTIVE: {
    label: "Active",
    className: "bg-error/10 text-error",
    icon: AlertTriangle,
  },
  ACKNOWLEDGED: {
    label: "Acknowledged",
    className: "bg-warning/10 text-warning",
    icon: Eye,
  },
  RESOLVED: {
    label: "Resolved",
    className: "bg-success/10 text-success",
    icon: CheckCircle,
  },
} as const;

const metricLabels: Record<string, string> = {
  FIRST_RESPONSE_TIME: "First Response",
  AVG_RESPONSE_TIME: "Avg Response",
  RESOLUTION_TIME: "Resolution",
};

interface SlaBreachTableProps {
  breaches: SlaBreachLog[];
  policies: SlaPolicy[];
  onAcknowledge?: (breachId: string) => void;
  isAcknowledging?: boolean;
}

export function SlaBreachTable({
  breaches,
  policies,
  onAcknowledge,
  isAcknowledging,
}: SlaBreachTableProps) {
  const policyMap = new Map(policies.map((p) => [p.id, p]));

  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-medium text-on-surface-variant">
          SLA Breaches
        </h3>
        <span className="text-[11px] text-on-surface-variant/50">
          {breaches.length} breach{breaches.length !== 1 ? "es" : ""}
        </span>
      </div>

      {breaches.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-on-surface-variant/40">
          No breaches found — all SLAs are being met
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableHeaderRow>
              <TableHead>Status</TableHead>
              <TableHead>Policy</TableHead>
              <TableHead>Metric</TableHead>
              <TableHead align="right">Threshold</TableHead>
              <TableHead align="right">Actual</TableHead>
              <TableHead align="right">Over By</TableHead>
              <TableHead align="right">When</TableHead>
              {onAcknowledge && <TableHead align="right">Action</TableHead>}
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {breaches.map((breach) => {
              const config = statusConfig[breach.status];
              const StatusIcon = config.icon;
              const policy = policyMap.get(breach.policyId);

              return (
                <TableRow key={breach.id}>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${config.className}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-on-surface font-medium">
                    {policy?.name ?? "Unknown"}
                  </TableCell>
                  <TableCell className="text-on-surface-variant">
                    {metricLabels[breach.metricType] ?? breach.metricType}
                  </TableCell>
                  <TableCell align="right" className="tabular-nums text-on-surface-variant">
                    {formatMs(breach.thresholdMs)}
                  </TableCell>
                  <TableCell align="right" className="tabular-nums text-error font-medium">
                    {formatMs(breach.actualMs)}
                  </TableCell>
                  <TableCell align="right" className="tabular-nums text-error">
                    +{formatMs(breach.actualMs - breach.thresholdMs)}
                  </TableCell>
                  <TableCell align="right" className="text-on-surface-variant/60">
                    {formatTimeAgo(breach.createdAt)}
                  </TableCell>
                  {onAcknowledge && (
                    <TableCell align="right">
                      {breach.status === "ACTIVE" ? (
                        <button
                          onClick={() => onAcknowledge(breach.id)}
                          disabled={isAcknowledging}
                          className="text-[11px] text-primary hover:text-primary/80 font-medium disabled:opacity-50"
                        >
                          Acknowledge
                        </button>
                      ) : (
                        <span className="text-[11px] text-on-surface-variant/40">
                          —
                        </span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
