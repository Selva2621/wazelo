"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useSAAuditLogs } from "@/hooks/use-super-admin";
import type { PlatformAuditEntry } from "@/lib/api/super-admin";
import { useDebounce } from "@/hooks/use-debounce";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ExportCsvButton } from "@/components/super-admin/export-csv-button";
import { NEWEST_FIRST, nextSort, type ListSort } from "@/components/super-admin/sortable-header";
import { TABLE_CARD } from "@/components/super-admin/list-styles";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterBarDivider, FilterSelect } from "@/components/ui/filter-bar";

const ACTIONS: Record<string, string> = {
  SUPER_ADMIN_LOGIN: "Signed in",
  SUPER_ADMIN_LOGIN_FAILED: "Failed sign-in",
  SUPER_ADMIN_LOGOUT: "Signed out",
  TWO_FACTOR_ENABLED: "Turned on 2FA",
  TWO_FACTOR_DISABLED: "Turned off 2FA",
  PLAN_CREATED: "Created plan",
  PLAN_UPDATED: "Updated plan",
  PLAN_ARCHIVED: "Archived plan",
  PLAN_UNARCHIVED: "Unarchived plan",
  PLAN_DELETED: "Deleted plan",
  TICKET_CREATED: "Created ticket",
  TICKET_REPLIED: "Replied to ticket",
  TICKET_STATUS_CHANGED: "Changed ticket status",
  ORG_SUSPENDED: "Suspended organization",
  ORG_REACTIVATED: "Reactivated organization",
  SUBSCRIPTION_CANCELLED: "Cancelled subscription",
  SUBSCRIPTION_PLAN_CHANGED: "Changed plan",
  SUBSCRIPTION_TRIAL_EXTENDED: "Extended trial",
  ALERT_RULE_CREATED: "Created alert rule",
  TICKET_ASSIGNED: "Assigned ticket",
  ANNOUNCEMENT_CREATED: "Published announcement",
  ANNOUNCEMENT_ARCHIVED: "Archived announcement",
  ANNOUNCEMENT_RESTORED: "Restored announcement",
  ANNOUNCEMENT_UPDATED: "Edited announcement",
  ENTITLEMENT_OVERRIDE_SET: "Set limit/feature override",
  ENTITLEMENT_OVERRIDE_REMOVED: "Removed limit/feature override",
  KILL_SWITCH_ON: "Turned feature off platform-wide",
  KILL_SWITCH_OFF: "Turned feature back on platform-wide",
  SUPER_ADMIN_LOCKED: "Account locked (failed attempts)",
  SUPER_ADMIN_REFRESH_REUSED: "Stolen session token blocked",
  SUPER_ADMIN_SESSION_REVOKED: "Signed out a device",
  TWO_FACTOR_SETUP_STARTED: "Started 2FA setup",
  TWO_FACTOR_RECOVERY_CODE_USED: "Signed in with recovery code",
  TWO_FACTOR_RECOVERY_CODES_REGENERATED: "Created new recovery codes",
  CREDIT_GRANTED: "Credit granted",
  CREDIT_REVOKED: "Credit revoked",
  INVOICE_CREATED: "Invoice created",
  INVOICE_MARKED_PAID: "Invoice marked paid",
  INVOICE_VOIDED: "Invoice voided",
  COUPON_CREATED: "Coupon created",
  COUPON_DEACTIVATED: "Coupon deactivated",
  PLATFORM_SETTING_CHANGED: "Platform setting changed",
  AI_CREDIT_PACK_CREATED: "AI credit pack created",
  AI_CREDIT_PACK_UPDATED: "AI credit pack updated",
};

/** Humanises an action the map doesn't know yet (e.g. after a backend release). */
function actionLabel(action: string): string {
  return ACTIONS[action] ?? action.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

const ATTENTION = new Set([
  "SUPER_ADMIN_LOGIN_FAILED",
  "TWO_FACTOR_DISABLED",
  "ORG_SUSPENDED",
  "SUBSCRIPTION_CANCELLED",
  "SUPER_ADMIN_LOCKED",
  "SUPER_ADMIN_REFRESH_REUSED",
  "TWO_FACTOR_RECOVERY_CODE_USED",
  "KILL_SWITCH_ON",
  "INVOICE_VOIDED",
  "CREDIT_REVOKED",
]);
/** Date inputs sized to match the filter bar's selects */
const inputClass =
  "h-8 rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 text-label text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-focus";

function targetLabel(entry: PlatformAuditEntry): string {
  const meta = entry.metadata ?? {};
  const name = (meta.planName ?? meta.title ?? meta.email ?? meta.label) as string | undefined;
  if (name) return `${entry.targetType ?? ""} · ${name}`.replace(/^ · /, "");
  return entry.targetType ?? "—";
}

function Details({ entry }: { entry: PlatformAuditEntry }) {
  const meta = entry.metadata ?? {};
  const before = meta.before as Record<string, unknown> | undefined;
  const after = meta.after as Record<string, unknown> | undefined;
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];

  return (
    <div className="space-y-3 text-body">
      {keys.length > 0 && (
        <table className="text-body">
          <caption className="sr-only">Changed fields</caption>
          <thead>
            <tr className="text-left text-on-surface-variant">
              <th scope="col" className="pr-6 py-1 font-medium">Field</th>
              {before && <th scope="col" className="pr-6 py-1 font-medium">Before</th>}
              <th scope="col" className="py-1 font-medium">After</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k}>
                <td className="pr-6 py-1 text-on-surface-variant">{k}</td>
                {before && <td className="pr-6 py-1 text-on-surface font-mono">{JSON.stringify(before[k] ?? null)}</td>}
                <td className="py-1 text-on-surface font-mono">{JSON.stringify(after?.[k] ?? null)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-on-surface-variant">
        {entry.targetId && (<><dt>Target ID</dt><dd className="font-mono text-on-surface break-all">{entry.targetId}</dd></>)}
        {entry.orgId && (
          <>
            <dt>Organization</dt>
            <dd><Link href={`/super-admin/organizations/${entry.orgId}`} className="text-primary hover:underline">View organization</Link></dd>
          </>
        )}
        {typeof meta.reason === "string" && (<><dt>Reason</dt><dd className="text-on-surface">{meta.reason.replace(/_/g, " ")}</dd></>)}
        {entry.userAgent && (<><dt>Browser</dt><dd className="text-on-surface break-all">{entry.userAgent}</dd></>)}
      </dl>
    </div>
  );
}

export default function SuperAdminAuditLogPage() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") ?? undefined;
  const [action, setAction] = useState("");
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

  const [sort, setSort] = useState<ListSort>(NEWEST_FIRST);
  const changeSort = (next: ListSort) => { setSort(next); setPage(1); };

  const filters = {
    action: action || undefined,
    orgId,
    from: from || undefined,
    to: to || undefined,
    search: debouncedSearch || undefined,
    sort: sort.field,
    order: sort.order,
  };
  const { data, isLoading, isFetching, isError, refetch } = useSAAuditLogs({ page, limit: 25, ...filters });

  const resetPage = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  const columns: DataTableColumn<PlatformAuditEntry>[] = [
    {
      id: "createdAt",
      header: "When",
      sortable: true,
      cellClassName: "text-on-surface-variant whitespace-nowrap",
      cell: (entry) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="shrink-0 text-on-surface-variant/50" aria-hidden>
            {open === entry.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
          <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time>
        </span>
      ),
    },
    {
      id: "who",
      header: "Who",
      cellClassName: "text-on-surface",
      cell: (entry) =>
        entry.actorEmail ?? (entry.actorType === "SYSTEM" ? "System" : (entry.metadata?.email as string) ?? "Unknown"),
    },
    {
      id: "action",
      header: "Action",
      skeleton: "badge",
      cell: (entry) => (
        <Badge variant={ATTENTION.has(entry.action) ? "error" : "muted"}>{actionLabel(entry.action)}</Badge>
      ),
    },
    { id: "target", header: "Target", cellClassName: "text-on-surface-variant", cell: (entry) => targetLabel(entry) },
    {
      id: "ip",
      header: "IP address",
      cellClassName: "text-on-surface-variant font-mono text-body",
      cell: (entry) => entry.ipAddress ?? "—",
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <PageHeader
        title="Audit log"
        count={data?.total}
        description={
          orgId ? (
            <>One organization · <Link href="/super-admin/audit-log" className="text-primary hover:underline">show all</Link></>
          ) : (
            "Read-only record of every portal action"
          )
        }
        actions={<ExportCsvButton list="audit-logs" params={filters} />}
      />

      <FilterBar>
        <SearchInput
          id="audit-search"
          aria-label="Search admin email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search admin email…"
          className="w-full sm:max-w-xs"
        />
        <FilterSelect id="audit-action" label="Filter by action" active={!!action} value={action} onChange={(e) => resetPage(setAction)(e.target.value)}>
          <option value="">All actions</option>
          {Object.entries(ACTIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </FilterSelect>
        <FilterBarDivider />
        <label htmlFor="audit-from" className="inline-flex items-center gap-1.5 text-label text-on-surface-variant">
          From
          <input id="audit-from" type="date" value={from} max={to || undefined} onChange={(e) => resetPage(setFrom)(e.target.value)} className={inputClass} />
        </label>
        <label htmlFor="audit-to" className="inline-flex items-center gap-1.5 text-label text-on-surface-variant">
          To
          <input id="audit-to" type="date" value={to} min={from || undefined} onChange={(e) => resetPage(setTo)(e.target.value)} className={inputClass} />
        </label>
        {isFetching && !isLoading && (
          <span role="status" className="text-label text-on-surface-variant">Updating…</span>
        )}
      </FilterBar>

      <div className={TABLE_CARD}>
        <DataTable
          label="Audit log entries"
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(entry) => entry.id}
          rowActionLabel={(entry) => `${open === entry.id ? "Hide" : "Show"} details for ${actionLabel(entry.action)}`}
          rowClassName={(entry) => (ATTENTION.has(entry.action) ? "bg-error/5" : undefined)}
          loading={isLoading}
          error={isError}
          onRetry={() => refetch()}
          empty={{
            title: debouncedSearch ? `No entries match “${debouncedSearch}”` : "No entries match these filters",
            compact: true,
          }}
          onRowClick={(entry) => setOpen(open === entry.id ? null : entry.id)}
          renderExpandedRow={(entry) => <Details entry={entry} />}
          isRowExpanded={(entry) => open === entry.id}
          sort={{ id: sort.field, order: sort.order }}
          onSortChange={(next) => changeSort(nextSort(sort, next.id, "desc"))}
          pagination={data ? { page: page - 1, pageSize: 25, total: data.total, onPageChange: (p) => setPage(p + 1) } : undefined}
        />
      </div>
    </div>
  );
}
