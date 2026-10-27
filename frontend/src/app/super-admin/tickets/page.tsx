"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { useSATickets } from "@/hooks/use-super-admin";
import { useDebounce } from "@/hooks/use-debounce";
import { SearchInput } from "@/components/ui/search-input";
import { PAGE_SIZE } from "@/lib/constants";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, humanizeStatus } from "@/components/super-admin/status-badge";
import { TicketSlaBadge, WaitingOnUs, useNow } from "@/components/super-admin/ticket-sla";
import { cn } from "@/lib/utils";
import { ExportCsvButton } from "@/components/super-admin/export-csv-button";
import { NEWEST_FIRST, nextSort, type ListSort } from "@/components/super-admin/sortable-header";
import { TABLE_CARD, sentenceCase } from "@/components/super-admin/list-styles";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterBarDivider, FilterSelect } from "@/components/ui/filter-bar";

/** Sortable column (server sort field, on the server whitelist) → first-click direction */
const SORT_FIRST_ORDER: Record<string, "asc" | "desc"> = {
  priority: "desc",
  status: "asc",
  createdAt: "desc",
  updatedAt: "desc",
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

  const columns: DataTableColumn<NonNullable<typeof data>["tickets"][number]>[] = [
    {
      id: "title",
      header: "Title",
      cell: (t) => (
        <>
          <Link href={`/super-admin/tickets/${t.id}`} className="font-medium text-on-surface hover:text-primary line-clamp-1">{t.title}</Link>
          <p className="text-label text-on-surface-variant">{t.user?.firstName} {t.user?.lastName}</p>
        </>
      ),
    },
    { id: "org", header: "Org", cellClassName: "text-on-surface-variant", cell: (t) => t.organization?.name },
    { id: "category", header: "Category", cellClassName: "text-on-surface-variant text-label", cell: (t) => t.category },
    { id: "priority", header: "Priority", sortable: true, skeleton: "badge", cell: (t) => priorityBadge(t.priority) },
    { id: "status", header: "Status", sortable: true, skeleton: "badge", cell: (t) => <StatusBadge status={t.status} /> },
    {
      id: "firstReply",
      header: "First reply",
      skeleton: "badge",
      cell: (t) => (
        <div className="flex flex-col items-start gap-1">
          {t.sla ? <TicketSlaBadge sla={t.sla} now={now} /> : <span className="text-on-surface-variant">—</span>}
          {t.sla?.waitingOnSupport && <WaitingOnUs />}
        </div>
      ),
    },
    { id: "assignee", header: "Assignee", cellClassName: "text-on-surface-variant", cell: (t) => t.assignedTo?.name ?? "Unassigned" },
    {
      id: "createdAt",
      header: "Created",
      sortable: true,
      cellClassName: "text-on-surface-variant",
      cell: (t) => new Date(t.createdAt).toLocaleDateString(),
    },
    {
      id: "updatedAt",
      header: "Updated",
      sortable: true,
      cellClassName: "text-on-surface-variant",
      cell: (t) => (t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : "—"),
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <PageHeader
        title="Help tickets"
        count={data?.total}
        actions={<ExportCsvButton list="tickets" params={filters} />}
      />

      <FilterBar>
        <SearchInput
          aria-label="Search tickets by title or organization"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or organization…"
          className="w-full sm:max-w-xs"
        />
        <FilterBarDivider />
        {[
          { label: "Filter by status", value: status, onChange: (v: string) => { setStatus(v); setPage(1); }, options: STATUS_OPTIONS, placeholder: "All statuses" },
          { label: "Filter by category", value: category, onChange: (v: string) => { setCategory(v); setPage(1); }, options: CATEGORY_OPTIONS, placeholder: "All categories" },
          { label: "Filter by priority", value: priority, onChange: (v: string) => { setPriority(v); setPage(1); }, options: PRIORITY_OPTIONS, placeholder: "All priorities" },
        ].map((sel) => (
          <FilterSelect key={sel.label} label={sel.label} active={!!sel.value} value={sel.value} onChange={(e) => sel.onChange(e.target.value)}>
            {sel.options.map((s) => <option key={s} value={s}>{s ? sentenceCase(s) : sel.placeholder}</option>)}
          </FilterSelect>
        ))}
        <FilterSelect
          label="Filter by assignee"
          active={!!assignee}
          value={assignee}
          onChange={(e) => { setAssignee(e.target.value); setPage(1); }}
        >
          <option value="">Anyone</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
        </FilterSelect>
        <FilterBarDivider />
        <button
          type="button"
          aria-pressed={needsReply}
          onClick={() => { setNeedsReply((v) => !v); setPage(1); }}
          title="Open tickets where the customer spoke last or nobody has replied yet"
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-label transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
            needsReply
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline hover:text-on-surface",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", needsReply ? "bg-primary" : "bg-on-surface-variant")} aria-hidden />
          Waiting on us
        </button>
      </FilterBar>

      <div className={TABLE_CARD}>
        <DataTable
          label="Help tickets"
          columns={columns}
          rows={data?.tickets ?? []}
          rowKey={(t) => t.id}
          rowLabel={(t) => t.title}
          loading={isLoading}
          error={isError}
          onRetry={() => refetch()}
          empty={{
            icon: <LifeBuoy className="h-12 w-12" />,
            title: debouncedSearch
              ? `No tickets match “${debouncedSearch}”`
              : needsReply ? "No customers are waiting on a reply" : "No tickets found",
            description: debouncedSearch ? "Try a different title or organization." : "Try changing the filters.",
          }}
          sort={{ id: sort.field, order: sort.order }}
          onSortChange={(next) => changeSort(nextSort(sort, next.id, SORT_FIRST_ORDER[next.id] ?? "desc"))}
          pagination={data ? { page: page - 1, pageSize: PAGE_SIZE, total: data.total, onPageChange: (p) => setPage(p + 1) } : undefined}
        />
      </div>
    </div>
  );
}
