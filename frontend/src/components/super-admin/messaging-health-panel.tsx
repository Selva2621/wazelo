"use client";

import { AlertTriangle, CheckCircle2, MinusCircle, Radio, Smartphone, XCircle } from "lucide-react";
import { useSAOrgMessagingHealth } from "@/hooks/use-super-admin";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; icon: typeof CheckCircle2; variant: "success" | "warning" | "error" | "muted" }> = {
  HEALTHY: { label: "Healthy", icon: CheckCircle2, variant: "success" },
  DEGRADED: { label: "Degraded", icon: AlertTriangle, variant: "warning" },
  DOWN: { label: "Down", icon: XCircle, variant: "error" },
  NOT_CONNECTED: { label: "Not connected", icon: MinusCircle, variant: "muted" },
};

const CONNECTION_STYLE: Record<string, string> = {
  CONNECTED: "text-success",
  ACTIVE: "text-success",
  CONNECTING: "text-warning",
  RECONNECTING: "text-warning",
  VERIFYING: "text-warning",
  PENDING_SETUP: "text-on-surface-variant",
  DISCONNECTED: "text-error",
  ERROR: "text-error",
  SUSPENDED: "text-error",
};

function ago(value?: string | null) {
  if (!value) return "never";
  const mins = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return new Date(value).toLocaleDateString();
}

const td = "text-body-lg";

/** A row from the (untyped) messaging-health response */
type HealthRow = NonNullable<ReturnType<typeof useSAOrgMessagingHealth>["data"]>;

const sessionColumns: DataTableColumn<HealthRow>[] = [
  { id: "number", header: "Number", cellClassName: cn(td, "font-mono text-body"), cell: (s) => s.phoneNumber ?? "—" },
  {
    id: "owner",
    header: "Owner",
    cellClassName: cn(td, "text-on-surface-variant"),
    cell: (s) => [s.user?.firstName, s.user?.lastName].filter(Boolean).join(" ") || s.user?.email,
  },
  { id: "status", header: "Status", cell: (s) => <span className={cn(td, "font-medium", CONNECTION_STYLE[s.status])}>{s.status}</span> },
  { id: "lastHeartbeat", header: "Last heartbeat", cellClassName: cn(td, "text-on-surface-variant"), cell: (s) => ago(s.lastHeartbeatAt) },
  { id: "lastActive", header: "Last active", cellClassName: cn(td, "text-on-surface-variant"), cell: (s) => ago(s.lastActiveAt) },
  {
    id: "reconnects",
    header: "Reconnects",
    skeleton: "short",
    cellClassName: cn(td, "text-on-surface-variant tabular-nums"),
    cell: (s) => s.reconnectCount,
  },
];

const channelColumns: DataTableColumn<HealthRow>[] = [
  {
    id: "channel",
    header: "Channel",
    cellClassName: td,
    cell: (c) => (
      <>
        <span className="text-on-surface">{c.name}</span>
        {c.externalHandle && <span className="block text-label text-on-surface-variant">{c.externalHandle}</span>}
      </>
    ),
  },
  { id: "type", header: "Type", cellClassName: cn(td, "text-on-surface-variant"), cell: (c) => c.type },
  {
    id: "status",
    header: "Status",
    cell: (c) => (
      <span className={cn(td, "font-medium", CONNECTION_STYLE[c.status])}>
        {c.status}
        {c.suspendReason && <span className="block text-label text-on-surface-variant font-normal">{c.suspendReason}</span>}
      </span>
    ),
  },
  { id: "lastActive", header: "Last active", cellClassName: cn(td, "text-on-surface-variant"), cell: (c) => ago(c.lastActiveAt) },
  {
    id: "lastError",
    header: "Last error",
    cellClassName: cn(td, "text-on-surface-variant max-w-xs"),
    cell: (c) =>
      c.lastError ? (
        <>
          <span className="line-clamp-2" title={c.lastError}>{c.lastError}</span>
          <span className="text-label">{ago(c.lastErrorAt)}</span>
        </>
      ) : "—",
  },
];

/** WhatsApp sessions, channels and 7-day send outcomes for one org — support triage. */
export function MessagingHealthPanel({ orgId }: { orgId: string }) {
  const { data, isLoading, isError } = useSAOrgMessagingHealth(orgId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10" role="status">
        <Spinner className="text-primary" />
        <span className="sr-only">Loading WhatsApp health…</span>
      </div>
    );
  }
  if (isError || !data) return <p className="text-body-lg text-error">Couldn&apos;t load WhatsApp health.</p>;

  const overall = STATUS[data.assessment.status] ?? STATUS.NOT_CONNECTED;
  const OverallIcon = overall.icon;
  const byStatus: Record<string, number> = data.outbound.byStatus ?? {};
  const delivered = (byStatus.DELIVERED ?? 0) + (byStatus.READ ?? 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 space-y-3" aria-labelledby="wa-health-heading">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="wa-health-heading" className="text-body-lg font-medium text-on-surface">WhatsApp health</h2>
          <Badge variant={overall.variant}>
            <OverallIcon className="h-3.5 w-3.5" aria-hidden />
            {overall.label}
          </Badge>
        </div>
        {data.assessment.reasons.length > 0 && (
          <ul className="list-disc pl-5 text-body-lg text-on-surface space-y-0.5">
            {data.assessment.reasons.map((r: string) => <li key={r}>{r}</li>)}
          </ul>
        )}
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: `Sent (${data.windowDays}d)`, value: data.outbound.total },
            { label: "Delivered / read", value: delivered },
            { label: "Failed", value: byStatus.FAILED ?? 0 },
            {
              label: "Failure rate",
              value: data.assessment.failureRate === null ? "—" : `${(data.assessment.failureRate * 100).toFixed(1)}%`,
            },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl py-1">
              <dt className="text-label text-on-surface-variant">{label}</dt>
              <dd className="text-title font-semibold text-on-surface tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Sessions */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-x-auto" aria-labelledby="wa-sessions-heading">
        <h3 id="wa-sessions-heading" className="px-4 pt-4 text-body-lg font-medium text-on-surface">
          WhatsApp numbers ({data.sessions.length})
        </h3>
        <DataTable
          label="WhatsApp sessions"
          columns={sessionColumns}
          rows={data.sessions}
          rowKey={(s) => s.id}
          wrapperClassName="mt-2"
          empty={{
            icon: <Smartphone className="h-10 w-10" />,
            title: "No WhatsApp numbers connected",
            compact: true,
          }}
        />
      </section>

      {/* Channels */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-x-auto" aria-labelledby="wa-channels-heading">
        <h3 id="wa-channels-heading" className="px-4 pt-4 text-body-lg font-medium text-on-surface">
          Channels ({data.channels.length})
        </h3>
        <DataTable
          label="Messaging channels"
          columns={channelColumns}
          rows={data.channels}
          rowKey={(c) => c.id}
          wrapperClassName="mt-2"
          empty={{
            icon: <Radio className="h-10 w-10" />,
            title: "No channels configured",
            compact: true,
          }}
        />
      </section>

      {/* Failure reasons */}
      {data.failureReasons.length > 0 && (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 space-y-2" aria-labelledby="wa-failures-heading">
          <h3 id="wa-failures-heading" className="text-body-lg font-medium text-on-surface">
            Top failure reasons ({data.windowDays}d)
          </h3>
          <ul className="space-y-1">
            {data.failureReasons.map((f: { reason: string; count: number }) => (
              <li key={f.reason} className="flex justify-between gap-4 text-body-lg">
                <span className="text-on-surface break-words">{f.reason}</span>
                <span className="text-on-surface-variant tabular-nums shrink-0">{f.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
