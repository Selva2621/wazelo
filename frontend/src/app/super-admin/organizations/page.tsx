"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { useSAOrgs } from "@/hooks/use-super-admin";
import { useDebounce } from "@/hooks/use-debounce";
import { SearchInput } from "@/components/ui/search-input";
import { PAGE_SIZE } from "@/lib/constants";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/super-admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { ExportCsvButton } from "@/components/super-admin/export-csv-button";
import { NEWEST_FIRST, nextSort, type ListSort } from "@/components/super-admin/sortable-header";
import { TABLE_CARD, sentenceCase } from "@/components/super-admin/list-styles";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";

// "NONE" = orgs that never subscribed; "DELETED" = soft-deleted orgs (both handled by the backend filter)
const STATUS_OPTIONS = ["", "ACTIVE", "TRIAL", "PAST_DUE", "GRACE_PERIOD", "EXPIRED", "CANCELLED", "NONE", "DELETED"];
const STATUS_LABELS: Record<string, string> = { "": "All statuses", NONE: "No subscription", DELETED: "Deleted" };

export default function SuperAdminOrgsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search.trim(), 400);

  // Back to the first page whenever the settled search term changes
  const [prevSearch, setPrevSearch] = useState(debouncedSearch);
  if (prevSearch !== debouncedSearch) {
    setPrevSearch(debouncedSearch);
    setPage(1);
  }

  const [sort, setSort] = useState<ListSort>(NEWEST_FIRST);
  const changeSort = (next: ListSort) => { setSort(next); setPage(1); };

  const filters = { search: debouncedSearch || undefined, status: status || undefined, sort: sort.field, order: sort.order };
  const { data, isLoading, isError, refetch } = useSAOrgs({ page, limit: PAGE_SIZE, ...filters });

  const columns: DataTableColumn<NonNullable<typeof data>["orgs"][number]>[] = [
    {
      id: "name",
      header: "Organization",
      sortable: true,
      cell: (org) => (
        <>
          <Link href={`/super-admin/organizations/${org.id}`} className="font-medium text-on-surface hover:text-primary">
            {org.name}
          </Link>
          {status === "DELETED" || org.deletedAt ? (
            <Badge variant="error" className="ml-2">Deleted</Badge>
          ) : org.status === "SUSPENDED" && (
            <span className="ml-2"><StatusBadge status="SUSPENDED" /></span>
          )}
          <p className="text-label text-on-surface-variant">{org.slug}</p>
        </>
      ),
    },
    { id: "plan", header: "Plan", cellClassName: "text-on-surface", cell: (org) => org.subscription?.planName ?? "—" },
    {
      id: "status",
      header: "Status",
      skeleton: "badge",
      cell: (org) =>
        org.subscription?.status ? (
          <StatusBadge status={org.subscription.status} />
        ) : (
          <span className="text-label text-on-surface-variant">None</span>
        ),
    },
    { id: "users", header: "Users", skeleton: "short", cellClassName: "text-on-surface", cell: (org) => org.userCount },
    {
      id: "createdAt",
      header: "Created",
      sortable: true,
      cellClassName: "text-on-surface-variant",
      cell: (org) => new Date(org.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <PageHeader
        title="Organizations"
        count={data?.total}
        actions={<ExportCsvButton list="organizations" params={filters} />}
      />

      <FilterBar>
        <SearchInput
          aria-label="Search organizations by name or slug"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or slug…"
          className="w-full sm:max-w-sm"
        />
        <FilterSelect
          label="Filter by subscription status"
          active={!!status}
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s] ?? sentenceCase(s)}</option>
          ))}
        </FilterSelect>
      </FilterBar>

      <div className={TABLE_CARD}>
        <DataTable
          label="Organizations"
          columns={columns}
          rows={data?.orgs ?? []}
          rowKey={(org) => org.id}
          rowLabel={(org) => org.name}
          loading={isLoading}
          error={isError}
          onRetry={() => refetch()}
          empty={{
            icon: <Building2 className="h-12 w-12" />,
            title: debouncedSearch ? `No organizations match “${debouncedSearch}”` : "No organizations found",
            description: debouncedSearch ? "Try a different name or slug." : "Try changing the status filter.",
          }}
          sort={{ id: sort.field, order: sort.order }}
          onSortChange={(next) => changeSort(nextSort(sort, next.id, next.id === "name" ? "asc" : "desc"))}
          pagination={data ? { page: page - 1, pageSize: PAGE_SIZE, total: data.total, onPageChange: (p) => setPage(p + 1) } : undefined}
        />
      </div>
    </div>
  );
}
