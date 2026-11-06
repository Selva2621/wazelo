"use client";

import { useState } from "react";
import { AlertTriangle, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import type { CampaignBatchProgress, CampaignBatchState } from "@/lib/types/campaigns";

const PAGE_SIZE = 10;

const STATE: Record<CampaignBatchState, { label: string; variant: "success" | "primary" | "muted" | "error" | "warning" }> = {
  done: { label: "Done", variant: "success" },
  sending: { label: "Sending", variant: "primary" },
  waiting: { label: "Waiting", variant: "muted" },
  blocked: { label: "Blocked", variant: "error" },
  paused: { label: "Paused", variant: "warning" },
  stopped: { label: "Stopped", variant: "muted" },
};

function totals(batch: CampaignBatchProgress) {
  const c = batch.counts;
  const total = c.pending + c.queued + c.sent + c.delivered + c.failed + c.skipped;
  return { total, sent: c.sent + c.delivered, left: c.pending + c.queued, failed: c.failed };
}

function StateBadge({ batch }: { batch: CampaignBatchProgress }) {
  const state = STATE[batch.state] ?? STATE.waiting;
  return (
    <Badge variant={state.variant} dot pulse={batch.state === "sending"}>
      {state.label}
    </Badge>
  );
}

/** Why a batch is blocked, or its most common failure reason. */
function BatchNote({ batch }: { batch: CampaignBatchProgress }) {
  if (batch.issue) {
    return (
      <span className="inline-flex min-w-0 items-center gap-1 text-caption text-error">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{batch.issue}</span>
      </span>
    );
  }
  const top = batch.topFailures?.[0];
  if (!top) return <span className="text-on-surface-variant">—</span>;
  const all = batch.topFailures.map((f) => `${f.count} × ${f.reason}`).join(" · ");
  return (
    <span className="block truncate text-caption text-on-surface-variant" title={all}>
      {top.reason}
      {batch.topFailures.length > 1 && ` +${batch.topFailures.length - 1}`}
    </span>
  );
}

function SentProgress({ sent, total }: { sent: number; total: number }) {
  const pct = total > 0 ? Math.round((sent / total) * 100) : 0;
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="tabular-nums text-on-surface">
        {sent}
        <span className="text-on-surface-variant">/{total}</span>
      </span>
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-container-high" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const columns: DataTableColumn<CampaignBatchProgress>[] = [
  {
    id: "batch",
    header: "Batch",
    className: "w-[72px]",
    cellClassName: "font-medium tabular-nums text-on-surface",
    cell: (b) => b.batchNumber,
  },
  {
    id: "number",
    header: "WhatsApp number",
    cellClassName: "tabular-nums",
    cell: (b) => b.sessionPhoneNumber ?? <span className="text-on-surface-variant">—</span>,
  },
  {
    id: "sent",
    header: "Sent",
    align: "right",
    className: "w-[130px]",
    cell: (b) => {
      const t = totals(b);
      return <SentProgress sent={t.sent} total={t.total} />;
    },
  },
  {
    id: "left",
    header: "Left",
    align: "right",
    className: "w-[64px]",
    cellClassName: "tabular-nums",
    cell: (b) => totals(b).left,
  },
  {
    id: "failed",
    header: "Failed",
    align: "right",
    className: "w-[72px]",
    cell: (b) => {
      const failed = totals(b).failed;
      return <span className={cn("tabular-nums", failed > 0 && "text-error")}>{failed}</span>;
    },
  },
  {
    id: "status",
    header: "Status",
    className: "w-[110px]",
    skeleton: "badge",
    cell: (b) => <StateBadge batch={b} />,
  },
  {
    id: "note",
    header: "Note",
    className: "w-[220px]",
    cell: (b) => <BatchNote batch={b} />,
  },
];

/**
 * One row per batch: which number sends it, progress, what's left and its state.
 * Shared DataTable: pagination (10 per page) and compact phone rows.
 */
export function CampaignBatchTable({ batches }: { batches: CampaignBatchProgress[] }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(batches.length / PAGE_SIZE));
  // Stay on a real page if the list shrinks
  const current = Math.min(page, pageCount - 1);
  const rows = batches.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <DataTable
      label="Campaign batches"
      columns={columns}
      rows={rows}
      rowKey={(b) => String(b.batchNumber)}
      rowLabel={(b) => `Batch ${b.batchNumber}`}
      rowClassName={(b) => (b.state === "done" ? "text-on-surface-variant" : undefined)}
      empty={{
        icon: <Layers className="h-5 w-5" aria-hidden="true" />,
        title: "No batches yet",
        description: "Batches appear when the campaign starts.",
        compact: true,
      }}
      pagination={
        batches.length > PAGE_SIZE
          ? { page: current, pageSize: PAGE_SIZE, total: batches.length, onPageChange: setPage }
          : undefined
      }
      renderMobileRow={(b) => {
        const t = totals(b);
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-body font-medium text-on-surface">
                Batch {b.batchNumber}
                <span className="ml-2 text-label font-normal tabular-nums text-on-surface-variant">
                  {b.sessionPhoneNumber ?? "—"}
                </span>
              </span>
              <StateBadge batch={b} />
            </div>
            <div className="flex min-w-0 items-center justify-between gap-2 text-label text-on-surface-variant">
              <span className="shrink-0 tabular-nums">
                {t.sent}/{t.total} sent
                {t.failed > 0 && <span className="text-error"> · {t.failed} failed</span>}
              </span>
              {(b.issue || b.topFailures?.length > 0) && (
                <span className="min-w-0">
                  <BatchNote batch={b} />
                </span>
              )}
            </div>
          </div>
        );
      }}
    />
  );
}
