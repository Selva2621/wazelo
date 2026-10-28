"use client";

import { useState } from "react";
import Link from "next/link";
import { Repeat } from "lucide-react";
import { useSASubscriptions } from "@/hooks/use-super-admin";
import { useDebounce } from "@/hooks/use-debounce";
import { SearchInput } from "@/components/ui/search-input";
import { PAGE_SIZE } from "@/lib/constants";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/super-admin/status-badge";
import { formatMoney } from "@/lib/utils";
import { ExportCsvButton } from "@/components/super-admin/export-csv-button";
import { NEWEST_FIRST, nextSort, type ListSort } from "@/components/super-admin/sortable-header";
import { TABLE_CARD, sentenceCase } from "@/components/super-admin/list-styles";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";

const STATUS_OPTIONS = ["", "ACTIVE", "TRIAL", "PAST_DUE", "GRACE_PERIOD", "EXPIRED", "CANCELLED"];

/** Sort fields whose first click sorts ascending (the rest start descending) */
const ASC_FIRST = new Set(["status", "currentPeriodEnd"]);

/** One row of the (untyped) subscriptions API response */
type SubscriptionRow = NonNullable<ReturnType<typeof useSASubscriptions>["data"]>["subscriptions"][number];

const columns: DataTableColumn<SubscriptionRow>[] = [
  {
    id: "organization",
    header: "Organization",
    cell: (sub) => (
      <>
        <Link href={`/super-admin/organizations/${sub.organization?.id}`} className="font-medium text-on-surface hover:text-primary">
          {sub.organization?.name}
        </Link>
        <p className="text-label text-on-surface-variant">{sub.organization?.slug}</p>
      </>
    ),
  },
  { id: "plan", header: "Plan", cellClassName: "text-on-surface", cell: (sub) => sub.plan?.name },
  { id: "status", header: "Status", sortable: true, skeleton: "badge", cell: (sub) => <StatusBadge status={sub.status} /> },
  { id: "cycle", header: "Cycle", skeleton: "short", cellClassName: "text-on-surface-variant", cell: (sub) => (sub.billingCycle ? sentenceCase(sub.billingCycle) : "—") },
  {
    id: "priceInCents",
    header: "Price",
    sortable: true,
    skeleton: "short",
    cellClassName: "text-on-surface",
    cell: (sub) => formatMoney(sub.priceInCents, sub.currency),
  },
  {
    id: "currentPeriodEnd",
    header: "Period end",
    sortable: true,
    cellClassName: "text-on-surface-variant",
    cell: (sub) => new Date(sub.currentPeriodEnd).toLocaleDateString(),
  },
  {
    id: "createdAt",
    header: "Created",
    sortable: true,
    cellClassName: "text-on-surface-variant",
    cell: (sub) => new Date(sub.createdAt).toLocaleDateString(),
  },
];

export default function SuperAdminSubscriptionsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 350);

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
    search: debouncedSearch || undefined,
    sort: sort.field,
    order: sort.order,
  };
  const { data, isLoading, isError, refetch } = useSASubscriptions({ page, limit: PAGE_SIZE, ...filters });

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <PageHeader
        title="Subscriptions"
        count={data?.total}
        actions={<ExportCsvButton list="subscriptions" params={filters} />}
      />

      <FilterBar>
        <SearchInput
          aria-label="Search subscriptions by organization name or slug"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search organization…"
          className="w-full sm:max-w-xs"
        />
        <FilterSelect
          label="Filter by subscription status"
          active={!!status}
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s ? sentenceCase(s) : "All statuses"}</option>)}
        </FilterSelect>
      </FilterBar>

      <div className={TABLE_CARD}>
        <DataTable
          label="Subscriptions"
          columns={columns}
          rows={data?.subscriptions ?? []}
          rowKey={(sub) => sub.id}
          rowLabel={(sub) => sub.organization?.name ?? "subscription"}
          loading={isLoading}
          error={isError}
          onRetry={() => refetch()}
          empty={{
            icon: <Repeat className="h-12 w-12" />,
            title: debouncedSearch ? `No subscriptions match “${debouncedSearch}”` : "No subscriptions found",
            description: debouncedSearch ? "Try a different organization name or slug." : "Try changing the status filter.",
          }}
          sort={{ id: sort.field, order: sort.order }}
          onSortChange={(next) => changeSort(nextSort(sort, next.id, ASC_FIRST.has(next.id) ? "asc" : "desc"))}
          pagination={data ? { page: page - 1, pageSize: PAGE_SIZE, total: data.total, onPageChange: (p) => setPage(p + 1) } : undefined}
        />
      </div>
    </div>
  );
}
