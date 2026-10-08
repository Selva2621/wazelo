"use client";

import { AlertTriangle, CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { useSAOrgMessagingHealth } from "@/hooks/use-super-admin";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  HEALTHY: { label: "Healthy", icon: CheckCircle2, className: "bg-success/10 text-success" },
  DEGRADED: { label: "Degraded", icon: AlertTriangle, className: "bg-warning/10 text-warning" },
  DOWN: { label: "Down", icon: XCircle, className: "bg-error/10 text-error" },
  NOT_CONNECTED: { label: "Not connected", icon: MinusCircle, className: "bg-surface-container text-on-surface-variant" },
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

const th = "px-4 py-2 text-label font-medium text-on-surface-variant text-left whitespace-nowrap";
const td = "px-4 py-2 text-body-lg";

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
      <section className="bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-3" aria-labelledby="wa-health-heading">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="wa-health-heading" className="text-body-lg font-medium text-on-surface">WhatsApp health</h2>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label font-medium", overall.className)}>
            <OverallIcon className="h-3.5 w-3.5" aria-hidden />
            {overall.label}
          </span>
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
            <div key={label} className="bg-surface-container rounded-lg p-3">
              <dt className="text-label text-on-surface-variant">{label}</dt>
              <dd className="text-title font-semibold text-on-surface tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Sessions */}
      <section className="bg-surface-container-low border border-outline-variant rounded-xl overflow-x-auto" aria-labelledby="wa-sessions-heading">
        <h3 id="wa-sessions-heading" className="px-4 pt-4 text-body-lg font-medium text-on-surface">
          WhatsApp numbers ({data.sessions.length})
        </h3>
        {data.sessions.length ? (
          <table className="w-full mt-2">
            <caption className="sr-only">WhatsApp sessions</caption>
            <thead>
              <tr className="border-b border-outline-variant">
                {["Number", "Owner", "Status", "Last heartbeat", "Last active", "Reconnects"].map((h) => (
                  <th key={h} scope="col" className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {data.sessions.map((s: any) => (
                <tr key={s.id}>
                  <td className={cn(td, "font-mono text-body")}>{s.phoneNumber ?? "—"}</td>
                  <td className={cn(td, "text-on-surface-variant")}>
                    {[s.user?.firstName, s.user?.lastName].filter(Boolean).join(" ") || s.user?.email}
                  </td>
                  <td className={cn(td, "font-medium", CONNECTION_STYLE[s.status])}>{s.status}</td>
                  <td className={cn(td, "text-on-surface-variant")}>{ago(s.lastHeartbeatAt)}</td>
                  <td className={cn(td, "text-on-surface-variant")}>{ago(s.lastActiveAt)}</td>
                  <td className={cn(td, "text-on-surface-variant tabular-nums")}>{s.reconnectCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 pb-4 pt-1 text-body-lg text-on-surface-variant">No WhatsApp numbers connected.</p>
        )}
      </section>

      {/* Channels */}
      <section className="bg-surface-container-low border border-outline-variant rounded-xl overflow-x-auto" aria-labelledby="wa-channels-heading">
        <h3 id="wa-channels-heading" className="px-4 pt-4 text-body-lg font-medium text-on-surface">
          Channels ({data.channels.length})
        </h3>
        {data.channels.length ? (
          <table className="w-full mt-2">
            <caption className="sr-only">Messaging channels</caption>
            <thead>
              <tr className="border-b border-outline-variant">
                {["Channel", "Type", "Status", "Last active", "Last error"].map((h) => (
                  <th key={h} scope="col" className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {data.channels.map((c: any) => (
                <tr key={c.id}>
                  <td className={td}>
                    <span className="text-on-surface">{c.name}</span>
                    {c.externalHandle && <span className="block text-label text-on-surface-variant">{c.externalHandle}</span>}
                  </td>
                  <td className={cn(td, "text-on-surface-variant")}>{c.type}</td>
                  <td className={cn(td, "font-medium", CONNECTION_STYLE[c.status])}>
                    {c.status}
                    {c.suspendReason && <span className="block text-label text-on-surface-variant font-normal">{c.suspendReason}</span>}
                  </td>
                  <td className={cn(td, "text-on-surface-variant")}>{ago(c.lastActiveAt)}</td>
                  <td className={cn(td, "text-on-surface-variant max-w-xs")}>
                    {c.lastError ? (
                      <>
                        <span className="line-clamp-2" title={c.lastError}>{c.lastError}</span>
                        <span className="text-label">{ago(c.lastErrorAt)}</span>
                      </>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 pb-4 pt-1 text-body-lg text-on-surface-variant">No channels configured.</p>
        )}
      </section>

      {/* Failure reasons */}
      {data.failureReasons.length > 0 && (
        <section className="bg-surface-container-low border border-outline-variant rounded-xl p-4 space-y-2" aria-labelledby="wa-failures-heading">
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
