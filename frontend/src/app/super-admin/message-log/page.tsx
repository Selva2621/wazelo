"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useSAHqMessages } from "@/hooks/use-super-admin";
import type { HqMessageLogEntry } from "@/lib/api/super-admin";
import { useDebounce } from "@/hooks/use-debounce";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TABLE_CARD } from "@/components/super-admin/list-styles";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterBarDivider, FilterSelect } from "@/components/ui/filter-bar";

const KINDS: Record<string, string> = {
  login_code: "Sign-in code",
  verification_code: "Number verification code",
  trial_ending: "Trial ending",
  trial_expired: "Plan expired",
  renewal_due: "Renewal due",
  grace_period: "Grace period",
  payment_failed: "Payment failed",
  whatsapp_disconnected: "WhatsApp disconnected",
};

const STATUSES: Record<HqMessageLogEntry["status"], { label: string; variant: "success" | "error" | "muted" | "info" }> = {
  QUEUED: { label: "Queued", variant: "muted" },
  PROCESSING: { label: "Sending", variant: "info" },
  SENT: { label: "Sent", variant: "info" },
  DELIVERED: { label: "Delivered", variant: "success" },
  READ: { label: "Read", variant: "success" },
  FAILED: { label: "Failed", variant: "error" },
};

const VIA: Record<string, string> = { QR: "QR session", CLOUD_API: "Cloud API" };

/** Date inputs sized to match the filter bar's selects */
const inputClass =
  "h-8 rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 text-label text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-focus";

const kindLabel = (kind: string) => KINDS[kind] ?? "Other message";
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

function Details({ entry }: { entry: HqMessageLogEntry }) {
  return (
    <div className="space-y-3 text-body">
      <p className="max-w-2xl whitespace-pre-wrap rounded-lg bg-surface-container-low px-3 py-2 text-on-surface">
        {entry.body ?? "No text"}
      </p>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-on-surface-variant">
        {entry.failedReason && (<><dt>Why it failed</dt><dd className="text-error">{entry.failedReason}</dd></>)}
        <dt>Sent from</dt><dd className="font-mono text-on-surface">{entry.from ?? "Number removed"}</dd>
        <dt>Sent</dt><dd className="text-on-surface">{when(entry.sentAt)}</dd>
        <dt>Delivered</dt><dd className="text-on-surface">{when(entry.deliveredAt)}</dd>
        <dt>Read</dt><dd className="text-on-surface">{when(entry.readAt)}</dd>
        {entry.retryCount > 0 && (<><dt>Retries</dt><dd className="text-on-surface">{entry.retryCount}</dd></>)}
      </dl>
    </div>
  );
}

/**
 * Every WhatsApp message sent from Wazelo HQ's number, on a QR session or the Cloud API.
 * Shown as stored: a sign-in or verification code is wiped in the database once sent.
 */
export default function SuperAdminMessageLogPage() {
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 350);

  // Back to the first page whenever the settled search term changes
  const [prevSearch, setPrevSearch] = useState(debouncedSearch);
  if (prevSearch !== debouncedSearch) {
    setPrevSearch(debouncedSearch);
    setPage(1);
  }

  const { data, isLoading, isFetching, isError, refetch } = useSAHqMessages({
    page,
    limit: 25,
    kind: kind || undefined,
    status: status || undefined,
    provider: provider || undefined,
    from: from || undefined,
    to: to || undefined,
    search: debouncedSearch || undefined,
  });

  const resetPage = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  const columns: DataTableColumn<HqMessageLogEntry>[] = [
    {
      id: "createdAt",
      header: "When",
      cellClassName: "text-on-surface-variant whitespace-nowrap",
      cell: (entry) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="shrink-0 text-on-surface-variant/50" aria-hidden>
            {open === entry.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
          <time dateTime={entry.createdAt}>{when(entry.createdAt)}</time>
        </span>
      ),
    },
    { id: "kind", header: "Type", cellClassName: "text-on-surface", cell: (entry) => kindLabel(entry.kind) },
    { id: "to", header: "To", cellClassName: "font-mono text-on-surface-variant whitespace-nowrap", cell: (entry) => entry.to ?? "—" },
    {
      id: "via",
      header: "Sent by",
      cellClassName: "text-on-surface-variant whitespace-nowrap",
      cell: (entry) => (entry.via ? VIA[entry.via] ?? entry.via : "—"),
    },
    {
      id: "status",
      header: "Status",
      skeleton: "badge",
      cell: (entry) => {
        const s = STATUSES[entry.status] ?? { label: entry.status, variant: "muted" as const };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      id: "body",
      header: "Message",
      cellClassName: "text-on-surface-variant",
      cell: (entry) => <span className="line-clamp-1 max-w-md">{entry.body ?? "—"}</span>,
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <PageHeader
        title="Message log"
        count={data?.total}
        description="Every WhatsApp message sent from Wazelo HQ's number. Codes are wiped once sent."
      />

      <FilterBar>
        <SearchInput
          id="msglog-search"
          aria-label="Search by phone number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search phone number…"
          inputMode="numeric"
          className="w-full sm:max-w-xs"
        />
        <FilterSelect id="msglog-kind" label="Filter by type" active={!!kind} value={kind} onChange={(e) => resetPage(setKind)(e.target.value)}>
          <option value="">All types</option>
          {Object.entries(KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </FilterSelect>
        <FilterSelect id="msglog-status" label="Filter by status" active={!!status} value={status} onChange={(e) => resetPage(setStatus)(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(STATUSES).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
        </FilterSelect>
        <FilterSelect id="msglog-via" label="Filter by sender" active={!!provider} value={provider} onChange={(e) => resetPage(setProvider)(e.target.value)}>
          <option value="">QR and Cloud API</option>
          {Object.entries(VIA).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </FilterSelect>
        <FilterBarDivider />
        <label htmlFor="msglog-from" className="inline-flex items-center gap-1.5 text-label text-on-surface-variant">
          From
          <input id="msglog-from" type="date" value={from} max={to || undefined} onChange={(e) => resetPage(setFrom)(e.target.value)} className={inputClass} />
        </label>
        <label htmlFor="msglog-to" className="inline-flex items-center gap-1.5 text-label text-on-surface-variant">
          To
          <input id="msglog-to" type="date" value={to} min={from || undefined} onChange={(e) => resetPage(setTo)(e.target.value)} className={inputClass} />
        </label>
        {isFetching && !isLoading && (
          <span role="status" className="text-label text-on-surface-variant">Updating…</span>
        )}
      </FilterBar>

      <div className={TABLE_CARD}>
        <DataTable
          label="Messages sent from Wazelo HQ"
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(entry) => entry.id}
          rowActionLabel={(entry) => `${open === entry.id ? "Hide" : "Show"} details for ${kindLabel(entry.kind)} to ${entry.to ?? "unknown"}`}
          rowClassName={(entry) => (entry.status === "FAILED" ? "bg-error/5" : undefined)}
          loading={isLoading}
          error={isError}
          onRetry={() => refetch()}
          empty={{ title: "No messages match these filters", compact: true }}
          onRowClick={(entry) => setOpen(open === entry.id ? null : entry.id)}
          renderExpandedRow={(entry) => <Details entry={entry} />}
          isRowExpanded={(entry) => open === entry.id}
          pagination={data ? { page: page - 1, pageSize: 25, total: data.total, onPageChange: (p) => setPage(p + 1) } : undefined}
        />
      </div>
    </div>
  );
}
