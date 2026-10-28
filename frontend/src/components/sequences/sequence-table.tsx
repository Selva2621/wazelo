"use client";

import { Workflow, Play, Pause, StopCircle, RotateCcw, Trash2, BarChart3 } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { CampaignSequence, SequenceStatus } from "@/lib/types/sequences";
import { formatDelay } from "@/lib/types/sequences";
import { IconButton } from "@/components/ui/icon-button";

const STATUS_VARIANTS: Record<SequenceStatus, "info" | "success" | "warning" | "error" | "muted"> = {
  DRAFT: "muted",
  ACTIVE: "success",
  PAUSED: "warning",
  COMPLETED: "info",
  CANCELLED: "error",
};

const STATUS_LABELS: Record<SequenceStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

interface SequenceTableProps {
  sequences: CampaignSequence[];
  onStart?: (id: string) => void;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onCancel?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCreateClick?: () => void;
  onAnalytics?: (id: string) => void;
}

export function SequenceTable({
  sequences,
  onStart,
  onPause,
  onResume,
  onCancel,
  onDelete,
  onCreateClick,
  onAnalytics,
}: SequenceTableProps) {
  const columns = useMemo<DataTableColumn<CampaignSequence>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        cell: (seq) => (
          <div className="min-w-0">
            <p className="text-body font-medium text-on-surface truncate">{seq.name}</p>
            {seq.description && (
              <p className="text-caption text-on-surface-variant/60 truncate max-w-[200px]">
                {seq.description}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        skeleton: "badge",
        cell: (seq) => (
          <div className="flex items-center gap-1.5">
            <Badge dot variant={STATUS_VARIANTS[seq.status]}>{STATUS_LABELS[seq.status]}</Badge>
            {seq.triggerType && <Badge variant="info">Auto</Badge>}
          </div>
        ),
      },
      {
        id: "steps",
        header: "Steps",
        cell: (seq) => (
          <div className="flex items-center gap-1">
            {seq.steps.map((step, i) => (
              <span key={step.id} className="flex items-center">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-caption font-semibold text-primary">
                  {i + 1}
                </span>
                {i < seq.steps.length - 1 && (
                  <span className="text-caption text-on-surface-variant/40 mx-0.5">
                    {formatDelay(seq.steps[i + 1]?.delayMinutes ?? 0)}→
                  </span>
                )}
              </span>
            ))}
          </div>
        ),
      },
      {
        id: "recipients",
        header: "Recipients",
        skeleton: "short",
        cellClassName: "text-label text-on-surface-variant",
        cell: (seq) => seq.totalRecipients,
      },
      {
        id: "progress",
        header: "Progress",
        skeleton: "bar",
        cell: (seq) => {
          const progress = seq.totalRecipients > 0
            ? Math.round(((seq.completedCount + seq.exitedCount) / seq.totalRecipients) * 100)
            : 0;
          return seq.totalRecipients > 0 ? (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-caption text-on-surface-variant">{progress}%</span>
            </div>
          ) : (
            <span className="text-caption text-on-surface-variant/40">—</span>
          );
        },
      },
      {
        id: "created",
        header: "Created",
        skeleton: "short",
        cellClassName: "text-caption text-on-surface-variant",
        cell: (seq) => new Date(seq.createdAt).toLocaleDateString(),
      },
      {
        id: "actions",
        header: "Actions",
        skeleton: "none",
        cell: (seq) => (
          <div className="flex items-center gap-1">
            {seq.status === "DRAFT" && onStart && (
              <IconButton size="xs"
                onClick={() => onStart(seq.id)}
                className="text-success hover:bg-success/10"
                title="Start" aria-label="Start">
                <Play className="h-3.5 w-3.5" />
              </IconButton>
            )}
            {seq.status === "ACTIVE" && onPause && (
              <IconButton size="xs"
                onClick={() => onPause(seq.id)}
                className="text-warning hover:bg-warning/10"
                title="Pause" aria-label="Pause">
                <Pause className="h-3.5 w-3.5" />
              </IconButton>
            )}
            {seq.status === "PAUSED" && onResume && (
              <IconButton size="xs"
                onClick={() => onResume(seq.id)}
                className="text-success hover:bg-success/10"
                title="Resume" aria-label="Resume">
                <RotateCcw className="h-3.5 w-3.5" />
              </IconButton>
            )}
            {["ACTIVE", "PAUSED"].includes(seq.status) && onCancel && (
              <IconButton size="xs" variant="danger"
                onClick={() => onCancel(seq.id)}
                className="text-error"
                title="Cancel" aria-label="Cancel">
                <StopCircle className="h-3.5 w-3.5" />
              </IconButton>
            )}
            {seq.status !== "DRAFT" && onAnalytics && (
              <IconButton size="xs"
                onClick={() => onAnalytics(seq.id)}
                className="hover:text-primary hover:bg-primary/10"
                title="Analytics" aria-label="Analytics">
                <BarChart3 className="h-3.5 w-3.5" />
              </IconButton>
            )}
            {seq.status === "DRAFT" && onDelete && (
              <IconButton size="xs" variant="danger"
                onClick={() => {
                  if (confirm(`Delete sequence "${seq.name}"? This cannot be undone.`)) {
                    onDelete(seq.id);
                  }
                }}
               
                title="Delete" aria-label="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            )}
          </div>
        ),
      },
    ],
    [onStart, onPause, onResume, onCancel, onDelete, onAnalytics],
  );

  return (
    <DataTable
      label="Sequences"
      columns={columns}
      rows={sequences}
      rowKey={(seq) => seq.id}
      rowLabel={(seq) => seq.name}
      empty={{
        icon: <Workflow className="h-12 w-12" />,
        title: "No sequences yet",
        description: "Create a drip sequence to send multi-step messages to contacts over time.",
        actionLabel: "Create Sequence",
        onAction: onCreateClick,
      }}
    />
  );
}
