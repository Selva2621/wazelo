"use client";

import { ToggleLeft, ToggleRight, Pencil, Trash2 } from "lucide-react";
import type { SlaPolicy } from "@/lib/types/sla";

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

const PRIORITY_STYLE: Record<string, { text: string; bg: string }> = {
  LOW:      { text: "text-on-surface-variant", bg: "bg-surface-container" },
  NORMAL:   { text: "text-primary",            bg: "bg-primary/8" },
  HIGH:     { text: "text-warning",            bg: "bg-warning/8" },
  CRITICAL: { text: "text-error",              bg: "bg-error/8" },
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
        <p className="text-[13px] font-medium text-on-surface-variant/50">No policies configured</p>
        <p className="text-[12px] text-on-surface-variant/35 mt-1">Create a policy to start tracking SLA compliance</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-outline-variant/10 overflow-hidden divide-y divide-outline-variant/8">
      {/* Table header */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-2.5 bg-surface-container/50">
        {["Policy", "Metric", "Breach", "Warning", ""].map((h) => (
          <span key={h} className="text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wide">{h}</span>
        ))}
      </div>

      {/* Rows */}
      {policies.map((p) => {
        const priority = PRIORITY_STYLE[p.priority] ?? PRIORITY_STYLE.NORMAL;
        const warningPct = p.warningThresholdMs ? Math.round((p.warningThresholdMs / p.thresholdMs) * 100) : null;

        return (
          <div
            key={p.id}
            className={`grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-3.5 bg-surface-container-lowest hover:bg-surface-container/30 transition-colors ${!p.isActive ? "opacity-50" : ""}`}
          >
            {/* Name + description */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-on-surface truncate">{p.name}</span>
                <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${priority.bg} ${priority.text}`}>
                  {p.priority}
                </span>
                {!p.isActive && (
                  <span className="shrink-0 text-[10px] text-on-surface-variant/40 font-medium">disabled</span>
                )}
              </div>
              {p.description && (
                <p className="text-[11px] text-on-surface-variant/50 truncate mt-0.5">{p.description}</p>
              )}
            </div>

            {/* Metric */}
            <span className="text-[12px] text-on-surface-variant">
              {METRIC_LABEL[p.metricType] ?? p.metricType}
              {p.businessHoursOnly && <span className="block text-[10px] text-on-surface-variant/40">Biz hours</span>}
            </span>

            {/* Breach */}
            <div>
              <span className="text-[13px] font-semibold text-error">{fmtMs(p.thresholdMs)}</span>
              {warningPct !== null && (
                <div className="mt-1 h-1 w-16 rounded-full overflow-hidden bg-outline-variant/15 flex">
                  <div className="bg-success/50 h-full" style={{ width: `${warningPct}%` }} />
                  <div className="bg-warning/50 h-full" style={{ width: `${100 - warningPct}%` }} />
                </div>
              )}
            </div>

            {/* Warning */}
            <span className="text-[13px] font-semibold text-warning">
              {p.warningThresholdMs ? fmtMs(p.warningThresholdMs) : <span className="text-on-surface-variant/30 font-normal">—</span>}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-0.5">
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
              <button
                onClick={() => onEdit(p)}
                title="Edit"
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/8 transition-colors"
              >
                <Pencil style={{ width: 14, height: 14 }} />
              </button>
              <button
                onClick={() => onDelete(p.id)}
                title="Delete"
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors"
              >
                <Trash2 style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
