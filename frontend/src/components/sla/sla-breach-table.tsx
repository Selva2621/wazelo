"use client";

import { AlertTriangle, CheckCircle, Eye } from "lucide-react";
import { useMemo } from "react";
import type { SlaBreachLog, SlaPolicy } from "@/lib/types/sla";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

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
  const columns = useMemo<DataTableColumn<SlaBreachLog>[]>(() => {
    const policyMap = new Map(policies.map((p) => [p.id, p]));
    const cols: DataTableColumn<SlaBreachLog>[] = [
      {
        id: "status",
        header: "Status",
        skeleton: "badge",
        cell: (breach) => {
          const config = statusConfig[breach.status];
          const StatusIcon = config.icon;
          return (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium ${config.className}`}
            >
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </span>
          );
        },
      },
      {
        id: "policy",
        header: "Policy",
        cellClassName: "text-on-surface font-medium",
        cell: (breach) => policyMap.get(breach.policyId)?.name ?? "Unknown",
      },
      {
        id: "metric",
        header: "Metric",
        cellClassName: "text-on-surface-variant",
        cell: (breach) => metricLabels[breach.metricType] ?? breach.metricType,
      },
      {
        id: "threshold",
        header: "Threshold",
        align: "right",
        skeleton: "short",
        cellClassName: "tabular-nums text-on-surface-variant",
        cell: (breach) => formatMs(breach.thresholdMs),
      },
      {
        id: "actual",
        header: "Actual",
        align: "right",
        skeleton: "short",
        cellClassName: "tabular-nums text-error font-medium",
        cell: (breach) => formatMs(breach.actualMs),
      },
      {
        id: "overBy",
        header: "Over By",
        align: "right",
        skeleton: "short",
        cellClassName: "tabular-nums text-error",
        cell: (breach) => `+${formatMs(breach.actualMs - breach.thresholdMs)}`,
      },
      {
        id: "when",
        header: "When",
        align: "right",
        skeleton: "short",
        cellClassName: "text-on-surface-variant/60",
        cell: (breach) => formatTimeAgo(breach.createdAt),
      },
    ];
    if (onAcknowledge) {
      cols.push({
        id: "action",
        header: "Action",
        align: "right",
        skeleton: "none",
        cell: (breach) =>
          breach.status === "ACTIVE" ? (
            <button
              onClick={() => onAcknowledge(breach.id)}
              disabled={isAcknowledging}
              className="text-caption text-primary hover:text-primary/80 font-medium disabled:opacity-50"
            >
              Acknowledge
            </button>
          ) : (
            <span className="text-caption text-on-surface-variant/40">
              —
            </span>
          ),
      });
    }
    return cols;
  }, [policies, onAcknowledge, isAcknowledging]);

  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-body font-medium text-on-surface-variant">
          SLA Breaches
        </h3>
        <span className="text-caption text-on-surface-variant/50">
          {breaches.length} breach{breaches.length !== 1 ? "es" : ""}
        </span>
      </div>

      <DataTable
        label="SLA breaches"
        columns={columns}
        rows={breaches}
        rowKey={(breach) => breach.id}
        empty={{
          icon: <CheckCircle className="h-10 w-10" />,
          title: "No breaches found",
          description: "All SLAs are being met.",
          compact: true,
        }}
      />
    </div>
  );
}
