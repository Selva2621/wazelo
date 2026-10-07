"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useSAAuditLogs } from "@/hooks/use-super-admin";
import type { PlatformAuditEntry } from "@/lib/api/super-admin";
import { Spinner } from "@/components/ui/spinner";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

const ACTIONS: Record<string, string> = {
  SUPER_ADMIN_LOGIN: "Signed in",
  SUPER_ADMIN_LOGIN_FAILED: "Failed sign-in",
  SUPER_ADMIN_LOGOUT: "Signed out",
  TWO_FACTOR_ENABLED: "Turned on 2FA",
  TWO_FACTOR_DISABLED: "Turned off 2FA",
  PLAN_CREATED: "Created plan",
  PLAN_UPDATED: "Updated plan",
  TICKET_CREATED: "Created ticket",
  TICKET_REPLIED: "Replied to ticket",
  TICKET_STATUS_CHANGED: "Changed ticket status",
  ORG_SUSPENDED: "Suspended organization",
  ORG_REACTIVATED: "Reactivated organization",
  SUBSCRIPTION_CANCELLED: "Cancelled subscription",
  SUBSCRIPTION_PLAN_CHANGED: "Changed plan",
  SUBSCRIPTION_TRIAL_EXTENDED: "Extended trial",
  ALERT_RULE_CREATED: "Created alert rule",
};

const ATTENTION = new Set([
  "SUPER_ADMIN_LOGIN_FAILED",
  "TWO_FACTOR_DISABLED",
  "ORG_SUSPENDED",
  "SUBSCRIPTION_CANCELLED",
]);
const inputClass =
  "bg-surface-container border border-outline-variant text-body-lg text-on-surface rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary";

function targetLabel(entry: PlatformAuditEntry): string {
  const meta = entry.metadata ?? {};
  const name = (meta.planName ?? meta.title ?? meta.email) as string | undefined;
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

  const { data, isLoading, isFetching } = useSAAuditLogs({
    page,
    limit: 25,
    action: action || undefined,
    orgId,
    from: from || undefined,
    to: to || undefined,
  });

  const resetPage = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-title font-semibold text-on-surface">Audit Log</h1>
        <p className="text-body-lg text-on-surface-variant">
          Every action taken in this portal. Entries can't be edited or deleted.
          {orgId && <> Showing one organization · <Link href="/super-admin/audit-log" className="text-primary hover:underline">show all</Link></>}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="audit-action" className="block text-label text-on-surface-variant mb-1">Action</label>
          <select id="audit-action" value={action} onChange={(e) => resetPage(setAction)(e.target.value)} className={inputClass}>
            <option value="">All actions</option>
            {Object.entries(ACTIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="audit-from" className="block text-label text-on-surface-variant mb-1">From</label>
          <input id="audit-from" type="date" value={from} max={to || undefined} onChange={(e) => resetPage(setFrom)(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="audit-to" className="block text-label text-on-surface-variant mb-1">To</label>
          <input id="audit-to" type="date" value={to} min={from || undefined} onChange={(e) => resetPage(setTo)(e.target.value)} className={inputClass} />
        </div>
        {isFetching && !isLoading && (
          <span role="status" className="text-label text-on-surface-variant pb-2.5">Updating…</span>
        )}
      </div>

      <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-x-auto">
        <table className="w-full text-body-lg">
          <caption className="sr-only">Audit log entries, newest first</caption>
          <thead>
            <tr className="border-b border-outline-variant text-left">
              <th scope="col" className="w-10"><span className="sr-only">Details</span></th>
              {["When", "Who", "Action", "Target", "IP address"].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 text-on-surface-variant font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center" role="status">
                  <Spinner className="mx-auto text-primary" />
                  <span className="sr-only">Loading audit log…</span>
                </td>
              </tr>
            ) : !data?.items.length ? (
              <tr><td colSpan={6} className="py-12 text-center text-on-surface-variant">No entries match these filters</td></tr>
            ) : data.items.map((entry) => {
              const expanded = open === entry.id;
              return (
                <Fragment key={entry.id}>
                  <tr className={cn("hover:bg-surface-container transition-colors", ATTENTION.has(entry.action) && "bg-error/5")}>
                    <td className="pl-2">
                      <IconButton
                        size="sm"
                        aria-expanded={expanded}
                        aria-controls={`audit-details-${entry.id}`}
                        aria-label={`${expanded ? "Hide" : "Show"} details`}
                        onClick={() => setOpen(expanded ? null : entry.id)}
                      >
                        <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} aria-hidden />
                      </IconButton>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                      <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time>
                    </td>
                    <td className="px-4 py-3 text-on-surface">
                      {entry.actorEmail ?? (entry.actorType === "SYSTEM" ? "System" : (entry.metadata?.email as string) ?? "Unknown")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-label px-2 py-0.5 rounded-full font-medium",
                        ATTENTION.has(entry.action) ? "bg-error/10 text-error" : "bg-surface-container text-on-surface-variant")}>
                        {ACTIONS[entry.action] ?? entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{targetLabel(entry)}</td>
                    <td className="px-4 py-3 text-on-surface-variant font-mono text-body">{entry.ipAddress ?? "—"}</td>
                  </tr>
                  {expanded && (
                    <tr id={`audit-details-${entry.id}`}>
                      <td />
                      <td colSpan={5} className="px-4 pb-4"><Details entry={entry} /></td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
            <span className="text-label text-on-surface-variant">{data.total} entries</span>
            <div className="flex items-center gap-2">
              <IconButton size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </IconButton>
              <span className="text-label text-on-surface-variant">{page} / {data.totalPages}</span>
              <IconButton size="sm" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} aria-label="Next page">
                <ChevronRight className="h-4 w-4" aria-hidden />
              </IconButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
