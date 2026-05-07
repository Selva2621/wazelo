"use client";

import { Workflow, Play, Pause, StopCircle, RotateCcw, Trash2, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableHeader,
  TableHeaderRow,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import type { CampaignSequence, SequenceStatus } from "@/lib/types/sequences";
import { formatDelay } from "@/lib/types/sequences";

const STATUS_VARIANTS: Record<SequenceStatus, "info" | "success" | "warning" | "error" | "muted"> = {
  DRAFT: "muted",
  ACTIVE: "success",
  PAUSED: "warning",
  COMPLETED: "info",
  CANCELLED: "error",
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
  if (!sequences.length) {
    return (
      <EmptyState
        icon={<Workflow className="h-12 w-12" />}
        title="No sequences yet"
        description="Create a drip sequence to send multi-step messages to contacts over time."
        actionLabel="Create Sequence"
        onAction={onCreateClick}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableHeaderRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Steps</TableHead>
          <TableHead>Recipients</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Actions</TableHead>
        </TableHeaderRow>
      </TableHeader>
      <TableBody>
        {sequences.map((seq) => {
          const progress = seq.totalRecipients > 0
            ? Math.round(((seq.completedCount + seq.exitedCount) / seq.totalRecipients) * 100)
            : 0;

          return (
            <TableRow key={seq.id}>
              <TableCell>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-on-surface truncate">{seq.name}</p>
                  {seq.description && (
                    <p className="text-[11px] text-on-surface-variant/60 truncate max-w-[200px]">
                      {seq.description}
                    </p>
                  )}
                </div>
              </TableCell>

              <TableCell>
                <Badge variant={STATUS_VARIANTS[seq.status]}>{seq.status}</Badge>
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-1">
                  {seq.steps.map((step, i) => (
                    <span key={step.id} className="flex items-center">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {i + 1}
                      </span>
                      {i < seq.steps.length - 1 && (
                        <span className="text-[9px] text-on-surface-variant/40 mx-0.5">
                          {formatDelay(seq.steps[i + 1]?.delayMinutes ?? 0)}→
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </TableCell>

              <TableCell className="text-[12px] text-on-surface-variant">
                {seq.totalRecipients}
              </TableCell>

              <TableCell>
                {seq.totalRecipients > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-surface-container-high overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-on-surface-variant">{progress}%</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-on-surface-variant/40">—</span>
                )}
              </TableCell>

              <TableCell className="text-[11px] text-on-surface-variant">
                {new Date(seq.createdAt).toLocaleDateString()}
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-1">
                  {seq.status === "DRAFT" && onStart && (
                    <button
                      onClick={() => onStart(seq.id)}
                      className="p-1 rounded text-success hover:bg-success/10 transition-colors"
                      title="Start"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {seq.status === "ACTIVE" && onPause && (
                    <button
                      onClick={() => onPause(seq.id)}
                      className="p-1 rounded text-warning hover:bg-warning/10 transition-colors"
                      title="Pause"
                    >
                      <Pause className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {seq.status === "PAUSED" && onResume && (
                    <button
                      onClick={() => onResume(seq.id)}
                      className="p-1 rounded text-success hover:bg-success/10 transition-colors"
                      title="Resume"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {["DRAFT", "ACTIVE", "PAUSED"].includes(seq.status) && onCancel && (
                    <button
                      onClick={() => onCancel(seq.id)}
                      className="p-1 rounded text-error hover:bg-error/10 transition-colors"
                      title="Cancel"
                    >
                      <StopCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {seq.status !== "DRAFT" && onAnalytics && (
                    <button
                      onClick={() => onAnalytics(seq.id)}
                      className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Analytics"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {seq.status === "DRAFT" && onDelete && (
                    <button
                      onClick={() => onDelete(seq.id)}
                      className="p-1 rounded text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
