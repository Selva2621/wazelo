"use client";

import { ScrollText, ChevronDown, ChevronRight } from "lucide-react";
import { useState, Fragment } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableHeader,
  TableHeaderRow,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
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
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateStr));
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function ExecutionLogsTable({
  logs,
  total,
  take,
  skip,
  isLoading,
  onPageChange,
}: ExecutionLogsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const currentPage = Math.floor(skip / take) + 1;
  const totalPages = Math.ceil(total / take);

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableHeaderRow>
            <TableHead>Rule</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Executed At</TableHead>
            <TableHead align="center">Retries</TableHead>
          </TableHeaderRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="h-3.5 w-40 rounded bg-surface-container-high animate-pulse" />
              </TableCell>
              <TableCell><div className="h-5 w-24 rounded-full bg-surface-container-high animate-pulse" /></TableCell>
              <TableCell><div className="h-5 w-20 rounded-full bg-surface-container-high animate-pulse" /></TableCell>
              <TableCell><div className="h-3.5 w-12 rounded bg-surface-container-high animate-pulse" /></TableCell>
              <TableCell><div className="h-3.5 w-32 rounded bg-surface-container-high animate-pulse" /></TableCell>
              <TableCell align="center"><div className="h-3.5 w-6 rounded bg-surface-container-high animate-pulse mx-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={<ScrollText className="h-12 w-12" />}
        title="No execution logs"
        description="Logs will appear here once automation rules start executing."
      />
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableHeaderRow>
            <TableHead>Rule</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Executed At</TableHead>
            <TableHead align="center">Retries</TableHead>
          </TableHeaderRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const isExpanded = expandedId === log.id;
            const hasDetail = !!(log.error || (log.actionResults && log.actionResults.length > 0));

            return (
              <Fragment key={log.id}>
                <TableRow
                  onClick={() => hasDetail && setExpandedId(isExpanded ? null : log.id)}
                  className={hasDetail ? "cursor-pointer" : undefined}
                >
                  {/* Rule name + expand chevron */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 min-w-0">
                      {hasDetail && (
                        <span className="text-on-surface-variant/40 flex-shrink-0">
                          {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />
                          }
                        </span>
                      )}
                      <p className="text-[13px] font-medium text-on-surface truncate">
                        {log.rule.name}
                      </p>
                    </div>
                  </TableCell>

                  {/* Trigger type */}
                  <TableCell>
                    <TriggerTypeLabel triggerType={log.rule.triggerType} />
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <ExecutionStatusBadge status={log.status} />
                  </TableCell>

                  {/* Duration */}
                  <TableCell>
                    <span className="text-[12px] text-on-surface-variant tabular-nums">
                      {formatDuration(log.executionTimeMs)}
                    </span>
                  </TableCell>

                  {/* Executed at */}
                  <TableCell>
                    <span className="text-[12px] text-on-surface-variant tabular-nums">
                      {log.startedAt ? formatDate(log.startedAt) : formatDate(log.createdAt)}
                    </span>
                  </TableCell>

                  {/* Retry count */}
                  <TableCell align="center">
                    <span className="text-[12px] text-on-surface-variant tabular-nums">
                      {log.retryCount}
                    </span>
                  </TableCell>
                </TableRow>

                {/* Expanded detail row */}
                {isExpanded && hasDetail && (
                  <tr key={`${log.id}-detail`} className="bg-surface-container/30">
                    <td colSpan={6} className="px-5 py-3">
                      {log.error && (
                        <div className="mb-2">
                          <p className="text-[11px] font-medium text-error uppercase tracking-wide mb-1">Error</p>
                          <p className="text-[12px] text-error/80 font-mono bg-error/5 rounded-lg px-3 py-2 whitespace-pre-wrap break-words">
                            {log.error}
                          </p>
                        </div>
                      )}
                      {log.actionResults && log.actionResults.length > 0 && (
                        <div>
                          <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wide mb-1">Action Results</p>
                          <pre className="text-[11px] text-on-surface-variant font-mono bg-surface-container-high rounded-lg px-3 py-2 overflow-x-auto whitespace-pre-wrap break-words">
                            {JSON.stringify(log.actionResults, null, 2)}
                          </pre>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        total={total}
        onPageChange={(p) => onPageChange(p - 1)}
      />
    </div>
  );
}
