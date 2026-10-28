"use client";

import { ToggleLeft, ToggleRight, Pencil, Trash2 } from "lucide-react";
import type { SlaPolicy } from "@/lib/types/sla";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { IconButton } from "@/components/ui/icon-button";

function fmtMs(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 24) return rm ? `${h}h ${rm}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}

const METRIC_LABEL: Record<string, string> = {
  FIRST_RESPONSE_TIME: "First Response",
  AVG_RESPONSE_TIME:   "Avg Response",
  RESOLUTION_TIME:     "Resolution",
};

const PRIORITY_BADGE: Record<string, { label: string; variant: "muted" | "primary" | "warning" | "error" }> = {
  LOW:      { label: "Low",      variant: "muted" },
  NORMAL:   { label: "Normal",   variant: "primary" },
  HIGH:     { label: "High",     variant: "warning" },
  CRITICAL: { label: "Critical", variant: "error" },
};

interface SlaPolicyListProps {
  policies: SlaPolicy[];
  onToggle: (id: string, isActive: boolean) => void;
  onEdit: (policy: SlaPolicy) => void;
  onDelete: (id: string) => void;
  isUpdating?: boolean;
}

export function SlaPolicyList({ policies, onToggle, onEdit, onDelete, isUpdating }: SlaPolicyListProps) {
  if (policies.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest px-6 py-16 text-center">
        <p className="text-body font-medium text-on-surface-variant/50">No policies configured</p>
        <p className="text-label text-on-surface-variant/35 mt-1">Create a policy to start tracking SLA compliance</p>
      </div>
    );
  }

  const columns: DataTableColumn<SlaPolicy>[] = [
    {
      id: "policy",
      header: "Policy",
      cell: (p) => {
        const priority = PRIORITY_BADGE[p.priority] ?? PRIORITY_BADGE.NORMAL;
        return (
          <div className="min-w-0">
            <div className="flex items-center gap-2 max-lg:flex-wrap max-lg:gap-x-2 max-lg:gap-y-1">
              <span className="text-body font-medium text-on-surface truncate">{p.name}</span>
              <Badge variant={priority.variant} className="shrink-0">{priority.label}</Badge>
              {!p.isActive && (
                <span className="shrink-0 text-caption text-on-surface-variant/40 font-medium">disabled</span>
              )}
            </div>
            {p.description && (
              <p className="text-caption text-on-surface-variant/50 truncate mt-0.5">{p.description}</p>
            )}
          </div>
        );
      },
    },
    {
      id: "metric",
      header: "Metric",
      cellClassName: "text-label text-on-surface-variant",
      cell: (p) => (
        <>
          {METRIC_LABEL[p.metricType] ?? p.metricType}
          {p.businessHoursOnly && <span className="block text-caption text-on-surface-variant/40">Biz hours</span>}
        </>
      ),
    },
    {
      id: "breach",
      header: "Breach",
      skeleton: "short",
      cell: (p) => {
        const warningPct = p.warningThresholdMs ? Math.round((p.warningThresholdMs / p.thresholdMs) * 100) : null;
        return (
          <>
            <span className="text-body font-semibold text-error">{fmtMs(p.thresholdMs)}</span>
            {warningPct !== null && (
              <div className="mt-1 h-1 w-16 rounded-full overflow-hidden bg-outline-variant/15 flex">
                <div className="bg-success/50 h-full" style={{ width: `${warningPct}%` }} />
                <div className="bg-warning/50 h-full" style={{ width: `${100 - warningPct}%` }} />
              </div>
            )}
          </>
        );
      },
    },
    {
      id: "warning",
      header: "Warning",
      skeleton: "short",
      cellClassName: "text-body font-semibold text-warning",
      cell: (p) =>
        p.warningThresholdMs ? fmtMs(p.warningThresholdMs) : <span className="text-on-surface-variant/30 font-normal">—</span>,
    },
    {
      id: "actions",
      header: "Actions",
      hideHeader: true,
      align: "right",
      skeleton: "none",
      cell: (p) => (
        <div className="flex items-center justify-end gap-0.5">
          <button
            onClick={() => onToggle(p.id, !p.isActive)}
            disabled={isUpdating}
            title={p.isActive ? "Disable" : "Enable"}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40"
          >
            {p.isActive
              ? <ToggleRight className="h-4.5 w-4.5 text-success" style={{ width: 18, height: 18 }} />
              : <ToggleLeft className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />}
          </button>
          <IconButton size="sm"
            onClick={() => onEdit(p)}
            title="Edit"
            className="hover:text-primary hover:bg-primary/8" aria-label="Edit">
            <Pencil style={{ width: 14, height: 14 }} />
          </IconButton>
          <IconButton size="sm" variant="danger"
            onClick={() => onDelete(p.id)}
            title="Delete" aria-label="Delete">
            <Trash2 style={{ width: 14, height: 14 }} />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      label="SLA policies"
      columns={columns}
      rows={policies}
      rowKey={(p) => p.id}
      rowLabel={(p) => p.name}
      rowClassName={(p) => (!p.isActive ? "opacity-50" : undefined)}
    />
  );
}
