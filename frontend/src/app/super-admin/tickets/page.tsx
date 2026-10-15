"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSATickets } from "@/hooks/use-super-admin";
import { useDebounce } from "@/hooks/use-debounce";
import { Spinner } from "@/components/ui/spinner";
import { SearchInput } from "@/components/ui/search-input";
import { PAGE_SIZE } from "@/lib/constants";
import { IconButton } from "@/components/ui/icon-button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, humanizeStatus } from "@/components/super-admin/status-badge";
import { TicketSlaBadge, WaitingOnUs, useNow } from "@/components/super-admin/ticket-sla";
import { cn } from "@/lib/utils";
import { ExportCsvButton } from "@/components/super-admin/export-csv-button";
import { NEWEST_FIRST, SortableTh, type ListSort } from "@/components/super-admin/sortable-header";

const COLUMNS = ["Title", "Org", "Category", "Priority", "Status", "First reply", "Assignee", "Created", "Updated"];

/** Sortable column header → server sort field (server whitelist) and first-click direction */
const SORT_FIELDS: Record<string, { field: string; firstOrder: "asc" | "desc" }> = {
  Priority: { field: "priority", firstOrder: "desc" },
  Status: { field: "status", firstOrder: "asc" },
  Created: { field: "createdAt", firstOrder: "desc" },
  Updated: { field: "updatedAt", firstOrder: "desc" },
};

const STATUS_OPTIONS = ["", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const CATEGORY_OPTIONS = ["", "BILLING", "TECHNICAL", "GENERAL", "FEATURE_REQUEST"];
const PRIORITY_OPTIONS = ["", "LOW", "MEDIUM", "HIGH", "URGENT"];

const PRIORITY_VARIANT: Record<string, "muted" | "info" | "warning" | "error"> = {
  LOW: "muted",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "error",
};

function priorityBadge(p: string) {
  return <Badge variant={PRIORITY_VARIANT[p] ?? "muted"}>{humanizeStatus(p)}</Badge>;
}

export default function SuperAdminTicketsPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [needsReply, setNeedsReply] = useState(false);
  const now = useNow();
  const debouncedSearch = useDebounce(search.trim(), 350);
  const orgId = searchParams.get("orgId") ?? undefined;

  // Back to the first page whenever the settled search term changes
  const [prevSearch, setPrevSearch] = useState(debouncedSearch);
  if (prevSearch !== debouncedSearch) {
    setPrevSearch(debouncedSearch);
    setPage(1);
  }

  const [sort, setSort] = useState<ListSort>(NEWEST_FIRST);
  const changeSort = (next: ListSort) => { setSort(next); setPage(1); };

  const filters = {
    status: status || undefined,
    category: category || undefined,
    priority: priority || undefined,
    assignee: assignee || undefined,
    orgId,
    search: debouncedSearch || undefined,
    needsReply: needsReply || undefined,
    sort: sort.field,
    order: sort.order,
  };
  const { data, isLoading, isError, refetch } = useSATickets({ page, limit: PAGE_SIZE, ...filters });

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-title font-semibold text-on-surface">Help Tickets</h1>

      <div className="flex gap-2 flex-wrap">
        <SearchInput
          aria-label="Search tickets by title or organization"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or organization…"
          className="w-full sm:max-w-xs"
        />
        {[
          { label: "Filter by status", value: status, onChange: (v: string) => { setStatus(v); setPage(1); }, options: STATUS_OPTIONS, placeholder: "All statuses" },
          { label: "Filter by category", value: category, onChange: (v: string) => { setCategory(v); setPage(1); }, options: CATEGORY_OPTIONS, placeholder: "All categories" },
          { label: "Filter by priority", value: priority, onChange: (v: string) => { setPriority(v); setPage(1); }, options: PRIORITY_OPTIONS, placeholder: "All priorities" },
        ].map((sel) => (
          <select key={sel.label} aria-label={sel.label} value={sel.value} onChange={(e) => sel.onChange(e.target.value)}
            className="bg-surface-container border border-outline-variant text-body-lg text-on-surface rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
            {sel.options.map((s) => <option key={s} value={s}>{s || sel.placeholder}</option>)}
          </select>
        ))}
        <select
          aria-label="Filter by assignee"
          value={assignee}
          onChange={(e) => { setAssignee(e.target.value); setPage(1); }}
          className="bg-surface-container border border-outline-variant text-body-lg text-on-surface rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Anyone</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
        </select>
        <button
          type="button"
          aria-pressed={needsReply}
          onClick={() => { setNeedsReply((v) => !v); setPage(1); }}
          title="Open tickets where the customer spoke last or nobody has replied yet"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-body-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            needsReply
              ? "border-primary bg-primary/10 text-primary font-medium"
              : "border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", needsReply ? "bg-primary" : "bg-on-surface-variant")} aria-hidden />
          Waiting on us
        </button>
        <ExportCsvButton list="tickets" params={filters} className="sm:ml-auto" />
      </div>

      <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-x-auto">
        <table className="w-full text-body-lg">
          <caption className="sr-only">Help tickets</caption>
          <thead>
            <tr className="border-b border-outline-variant text-left">
              {COLUMNS.map((h) =>
                SORT_FIELDS[h] ? (
                  <SortableTh
                    key={h}
                    label={h}
                    field={SORT_FIELDS[h].field}
                    firstOrder={SORT_FIELDS[h].firstOrder}
                    sort={sort}
                    onSort={changeSort}
                  />
                ) : (
                  <th key={h} scope="col" className="px-4 py-3 text-on-surface-variant font-medium">{h}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {isLoading ? (
              <tr>
                <td colSpan={COLUMNS.length} className="py-12 text-center" role="status">
                  <Spinner className="mx-auto text-primary" />
                  <span className="sr-only">Loading tickets…</span>
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={COLUMNS.length} className="py-12 text-center text-error" role="alert">
                  Could not load tickets.{" "}
                  <button type="button" onClick={() => refetch()} className="underline hover:no-underline">
                    Try again
                  </button>
                </td>
              </tr>
            ) : data?.tickets?.length === 0 ? (
              <tr><td colSpan={COLUMNS.length} className="py-12 text-center text-on-surface-variant">
                {debouncedSearch
                  ? `No tickets match “${debouncedSearch}”`
                  : needsReply ? "No customers are waiting on a reply" : "No tickets found"}
              </td></tr>
            ) : data?.tickets?.map((t) => (
              <tr key={t.id} className="hover:bg-surface-container transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/super-admin/tickets/${t.id}`} className="font-medium text-on-surface hover:text-primary line-clamp-1">{t.title}</Link>
                  <p className="text-label text-on-surface-variant">{t.user?.firstName} {t.user?.lastName}</p>
                </td>
                <td className="px-4 py-3 text-on-surface-variant">{t.organization?.name}</td>
                <td className="px-4 py-3 text-on-surface-variant text-label">{t.category}</td>
                <td className="px-4 py-3">{priorityBadge(t.priority)}</td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1">
                    {t.sla ? <TicketSlaBadge sla={t.sla} now={now} /> : <span className="text-on-surface-variant">—</span>}
                    {t.sla?.waitingOnSupport && <WaitingOnUs />}
                  </div>
                </td>
                <td className="px-4 py-3 text-on-surface-variant">{t.assignedTo?.name ?? "Unassigned"}</td>
                <td className="px-4 py-3 text-on-surface-variant">{new Date(t.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-on-surface-variant">{t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
            <span className="text-label text-on-surface-variant">{data.total} total</span>
            <div className="flex items-center gap-2">
              <IconButton size="xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></IconButton>
              <span className="text-label text-on-surface-variant">{page} / {data.totalPages}</span>
              <IconButton size="xs" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} aria-label="Next page"><ChevronRight className="h-4 w-4" /></IconButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
