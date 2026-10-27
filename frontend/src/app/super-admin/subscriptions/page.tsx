"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSASubscriptions } from "@/hooks/use-super-admin";
import { useDebounce } from "@/hooks/use-debounce";
import { Spinner } from "@/components/ui/spinner";
import { SearchInput } from "@/components/ui/search-input";
import { PAGE_SIZE } from "@/lib/constants";
import { IconButton } from "@/components/ui/icon-button";
import { StatusBadge } from "@/components/super-admin/status-badge";
import { formatMoney } from "@/lib/utils";
import { ExportCsvButton } from "@/components/super-admin/export-csv-button";
import { NEWEST_FIRST, SortableTh, type ListSort } from "@/components/super-admin/sortable-header";
import { TABLE_CARD, TH, TR, sentenceCase } from "@/components/super-admin/list-styles";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";

const STATUS_OPTIONS = ["", "ACTIVE", "TRIAL", "PAST_DUE", "GRACE_PERIOD", "EXPIRED", "CANCELLED"];

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
        <table className="w-full text-body">
          <thead>
            <tr className="border-b border-outline-variant text-left">
              <th scope="col" className={TH}>Organization</th>
              <th scope="col" className={TH}>Plan</th>
              <SortableTh label="Status" field="status" firstOrder="asc" sort={sort} onSort={changeSort} />
              <th scope="col" className={TH}>Cycle</th>
              <SortableTh label="Price" field="priceInCents" sort={sort} onSort={changeSort} />
              <SortableTh label="Period end" field="currentPeriodEnd" firstOrder="asc" sort={sort} onSort={changeSort} />
              <SortableTh label="Created" field="createdAt" sort={sort} onSort={changeSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {isLoading ? (
              <tr><td colSpan={7} className="py-12 text-center"><Spinner className="mx-auto text-primary" /></td></tr>
            ) : isError ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-error" role="alert">
                  Could not load subscriptions.{" "}
                  <button type="button" onClick={() => refetch()} className="underline hover:no-underline">
                    Try again
                  </button>
                </td>
              </tr>
            ) : !data?.subscriptions?.length ? (
              <tr><td colSpan={7} className="py-12 text-center text-on-surface-variant">
                {debouncedSearch ? `No subscriptions match “${debouncedSearch}”` : "No subscriptions found"}
              </td></tr>
            ) : data.subscriptions.map((sub: any) => (
              <tr key={sub.id} className={TR}>
                <td className="px-4 py-3">
                  <Link href={`/super-admin/organizations/${sub.organization?.id}`} className="font-medium text-on-surface hover:text-primary">
                    {sub.organization?.name}
                  </Link>
                  <p className="text-label text-on-surface-variant">{sub.organization?.slug}</p>
                </td>
                <td className="px-4 py-3 text-on-surface">{sub.plan?.name}</td>
                <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                <td className="px-4 py-3 text-on-surface-variant">{sub.billingCycle}</td>
                <td className="px-4 py-3 text-on-surface">{formatMoney(sub.priceInCents, sub.currency)}</td>
                <td className="px-4 py-3 text-on-surface-variant">{new Date(sub.currentPeriodEnd).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-on-surface-variant">{new Date(sub.createdAt).toLocaleDateString()}</td>
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
