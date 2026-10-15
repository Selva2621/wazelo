"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSAOrgs } from "@/hooks/use-super-admin";
import { useDebounce } from "@/hooks/use-debounce";
import { Spinner } from "@/components/ui/spinner";
import { SearchInput } from "@/components/ui/search-input";
import { PAGE_SIZE } from "@/lib/constants";
import { IconButton } from "@/components/ui/icon-button";
import { StatusBadge } from "@/components/super-admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { ExportCsvButton } from "@/components/super-admin/export-csv-button";
import { NEWEST_FIRST, SortableTh, type ListSort } from "@/components/super-admin/sortable-header";

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

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-title font-semibold text-on-surface">Organizations</h1>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          aria-label="Search organizations by name or slug"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or slug…"
          className="w-full sm:max-w-sm"
        />
        <select
          aria-label="Filter by subscription status"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="bg-surface-container border border-outline-variant text-body-lg text-on-surface rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
          ))}
        </select>
        <ExportCsvButton list="organizations" params={filters} className="sm:ml-auto" />
      </div>

      <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-x-auto">
        <table className="w-full text-body-lg">
          <thead>
            <tr className="border-b border-outline-variant text-left">
              <SortableTh label="Organization" field="name" firstOrder="asc" sort={sort} onSort={changeSort} />
              <th scope="col" className="px-4 py-3 text-on-surface-variant font-medium">Plan</th>
              <th scope="col" className="px-4 py-3 text-on-surface-variant font-medium">Status</th>
              <th scope="col" className="px-4 py-3 text-on-surface-variant font-medium">Users</th>
              <SortableTh label="Created" field="createdAt" sort={sort} onSort={changeSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {isLoading ? (
              <tr><td colSpan={5} className="py-12 text-center"><Spinner className="mx-auto text-primary" /></td></tr>
            ) : isError ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-error" role="alert">
                  Could not load organizations.{" "}
                  <button type="button" onClick={() => refetch()} className="underline hover:no-underline">
                    Try again
                  </button>
                </td>
              </tr>
            ) : data?.orgs?.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-on-surface-variant">
                {debouncedSearch ? `No organizations match “${debouncedSearch}”` : "No organizations found"}
              </td></tr>
            ) : data?.orgs?.map((org: any) => (
              <tr key={org.id} className="hover:bg-surface-container transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/super-admin/organizations/${org.id}`} className="font-medium text-on-surface hover:text-primary">
                    {org.name}
                  </Link>
                  {status === "DELETED" || org.deletedAt ? (
                    <Badge variant="error" className="ml-2">Deleted</Badge>
                  ) : org.status === "SUSPENDED" && (
                    <span className="ml-2"><StatusBadge status="SUSPENDED" /></span>
                  )}
                  <p className="text-label text-on-surface-variant">{org.slug}</p>
                </td>
                <td className="px-4 py-3 text-on-surface">{org.subscription?.planName ?? "—"}</td>
                <td className="px-4 py-3">{org.subscription?.status ? (
                  <StatusBadge status={org.subscription.status} />
                ) : (
                  <span className="text-label text-on-surface-variant">None</span>
                )}</td>
                <td className="px-4 py-3 text-on-surface">{org.userCount}</td>
                <td className="px-4 py-3 text-on-surface-variant">{new Date(org.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
            <span className="text-label text-on-surface-variant">{data.total} total</span>
            <div className="flex items-center gap-2">
              <IconButton size="xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </IconButton>
              <span className="text-label text-on-surface-variant">{page} / {data.totalPages}</span>
              <IconButton size="xs" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
