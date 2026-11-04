"use client";

import { ScrollText, ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ExecutionStatusBadge } from "./execution-status-badge";
import { TriggerTypeLabel } from "./trigger-type-label";
import type { AutomationExecutionLog } from "@/lib/types/automation";

interface ExecutionLogsTableProps {
  logs: AutomationExecutionLog[];
  total: number;
  take: number;
  skip: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateStr));
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const ACTION_LABELS: Record<string, string> = {
  SEND_MESSAGE: "Send WhatsApp message",
  SEND_EMAIL: "Send email",
  ASSIGN_CONTACT: "Assign contact",
  ADD_TAG: "Add tag",
  UPDATE_STATUS: "Update lead status",
  ENROLL_IN_SEQUENCE: "Add to sequence",
  STOP_SEQUENCE: "Stop sequence",
  ASSIGN_CONVERSATION: "Assign chat",
};

const actionLabel = (type: unknown) => ACTION_LABELS[String(type)] ?? String(type ?? "Action");

const OUTCOME_CLASS = {
  done: "text-success",
  skipped: "text-on-surface-variant",
  failed: "text-error",
} as const;

/** One action's outcome in words: done, skipped (with why) or failed (with the error) */
function describeResult(r: Record<string, unknown>): { kind: keyof typeof OUTCOME_CLASS; text: string } {
  const result = (r.result ?? {}) as Record<string, unknown>;
  if (r.success === false) return { kind: "failed", text: `Failed${r.error ? ` — ${String(r.error)}` : ""}` };
  if (result.skipped) {
    const reason =
      typeof result.reason === "string" ? result.reason
      : result.skipped === "ALREADY_ACTIVE" ? "Already in it"
      : typeof result.skipped === "string" ? result.skipped
      : "";
    return { kind: "skipped", text: `Skipped${reason ? ` — ${reason}` : ""}` };
  }
  return { kind: "done", text: "Done" };
}

const hasDetail =(log: AutomationExecutionLog) =>
  !!(log.error || (log.actionResults && log.actionResults.length > 0));

/** Error and action results, shown under a row when it is opened. */
function LogDetail({ log }: { log: AutomationExecutionLog }) {
  return (
    <>
      {log.error && (
        <div className="mb-2">
          <p className="mb-1 text-caption font-medium text-error">Error</p>
          <p className="whitespace-pre-wrap break-words rounded-lg bg-error/5 px-3 py-2 font-mono text-label text-error/80">
            {log.error}
          </p>
        </div>
      )}
      {log.actionResults && log.actionResults.length > 0 && (
        <div>
          <p className="mb-1 text-caption font-medium text-on-surface-variant">Action results</p>
          <ul className="space-y-1 rounded-lg bg-surface-container-high px-3 py-2">
            {log.actionResults.map((r, i) => {
              const outcome = describeResult(r);
              return (
                <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-caption">
                  <span className="font-medium text-on-surface">{actionLabel(r.actionType)}</span>
                  <span className={OUTCOME_CLASS[outcome.kind]}>{outcome.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

export function ExecutionLogsTable({ logs, total, take, skip, isLoading, onPageChange }: ExecutionLogsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const columns = useMemo<DataTableColumn<AutomationExecutionLog>[]>(
    () => [
      {
        id: "rule",
        header: "Rule",
        cell: (log) => (
          <div className="flex min-w-0 items-center gap-1.5">
            {hasDetail(log) && (
              <span className="shrink-0 text-on-surface-variant/50" aria-hidden>
                {expandedId === log.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </span>
            )}
            <p className="truncate text-body font-medium text-on-surface">{log.rule.name}</p>
          </div>
        ),
      },
      { id: "trigger", header: "Trigger", skeleton: "badge", cell: (log) => <TriggerTypeLabel triggerType={log.rule.triggerType} /> },
      { id: "status", header: "Status", skeleton: "badge", cell: (log) => <ExecutionStatusBadge status={log.status} /> },
      {
        id: "duration",
        header: "Duration",
        skeleton: "short",
        cellClassName: "text-label tabular-nums text-on-surface-variant",
        cell: (log) => formatDuration(log.executionTimeMs),
      },
      {
        id: "executed",
        header: "Executed at",
        cellClassName: "text-label tabular-nums text-on-surface-variant",
        cell: (log) => formatDate(log.startedAt ?? log.createdAt),
      },
      {
        id: "retries",
        header: "Retries",
        align: "center",
        skeleton: "short",
        cellClassName: "text-label tabular-nums text-on-surface-variant",
        cell: (log) => log.retryCount,
      },
    ],
    [expandedId],
  );

  return (
    <DataTable
      label="Execution logs"
      columns={columns}
      rows={logs}
      rowKey={(log) => log.id}
      rowLabel={(log) => `${log.rule.name} details`}
      loading={isLoading}
      skeletonRows={6}
      // Rows with an error or results open a detail row
      onRowClick={(log) => hasDetail(log) && setExpandedId(expandedId === log.id ? null : log.id)}
      renderExpandedRow={(log) => <LogDetail log={log} />}
      isRowExpanded={(log) => expandedId === log.id && hasDetail(log)}
      pagination={{ page: Math.floor(skip / take), pageSize: take, total, onPageChange }}
      empty={{
        icon: <ScrollText className="h-12 w-12" />,
        title: "No execution logs",
        description: "Logs will appear here once automation rules start executing.",
      }}
    />
  );
}
