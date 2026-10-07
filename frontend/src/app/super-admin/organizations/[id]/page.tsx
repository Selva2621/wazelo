"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CreditCard, Activity, Gauge } from "lucide-react";
import { useSAOrg } from "@/hooks/use-super-admin";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { OrgActionsPanel } from "@/components/super-admin/org-actions-panel";
import { MessagingHealthPanel } from "@/components/super-admin/messaging-health-panel";
import { cn, formatMoney } from "@/lib/utils";

const TABS = ["Overview", "WhatsApp", "Usage", "Billing history", "Users", "Tickets"] as const;
type Tab = typeof TABS[number];

const USAGE_LABELS: Record<string, string> = {
  MESSAGES_SENT: "Messages sent",
  ACTIVE_USERS: "Active users",
  WHATSAPP_SESSIONS: "WhatsApp sessions",
  CAMPAIGN_EXECUTIONS: "Campaign runs",
  API_CALLS: "API calls",
  AI_CREDITS: "AI credits",
  MESSAGE_TEMPLATES: "Message templates",
};

function statusBadge(status?: string) {
  if (!status) return null;
  const colors: Record<string, string> = {
    ACTIVE: "bg-success/10 text-success border-success/30",
    TRIAL: "bg-warning/10 text-warning border-warning/30",
    PAST_DUE: "bg-warning/10 text-warning border-warning/30",
    GRACE_PERIOD: "bg-warning/10 text-warning border-warning/30",
    EXPIRED: "bg-error/10 text-error border-error/30",
    CANCELLED: "bg-surface-container text-on-surface-variant border-outline-variant",
  };
  return (
    <span className={`text-label px-2 py-0.5 rounded-full border font-medium ${colors[status] ?? "bg-surface-container text-on-surface-variant border-outline-variant"}`}>
      {status}
    </span>
  );
}

function UsageMeter({ label, value, limit }: { label: string; value: number; limit: number }) {
  const unlimited = limit === 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((value / limit) * 100));
  const tone = pct >= 100 ? "bg-error" : pct >= 80 ? "bg-warning" : "bg-primary";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-body-lg">
        <span className="text-on-surface-variant">{label}</span>
        <span className="text-on-surface tabular-nums">
          {value.toLocaleString()} / {unlimited ? "Unlimited" : limit.toLocaleString()}
          {!unlimited && <span className="text-on-surface-variant"> ({pct}%)</span>}
        </span>
      </div>
      {!unlimited && (
        <div
          role="meter"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={Math.min(value, limit)}
          className="h-1.5 bg-surface-container rounded-full overflow-hidden"
        >
          <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export default function OrgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useSAOrg(id);
  const [tab, setTab] = useState<Tab>("Overview");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" role="status">
        <Spinner className="text-primary" />
        <span className="sr-only">Loading organization…</span>
      </div>
    );
  }
  if (!data) return <div className="p-6 text-on-surface-variant">Organization not found</div>;

  const { org, subscription, subscriptionHistory, usageRecords, users, counts } = data;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/super-admin/organizations"
          aria-label="Back to organizations"
          className="text-on-surface-variant hover:text-on-surface rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
        <div>
          <h1 className="text-title font-semibold text-on-surface">{org.name}</h1>
          <p className="text-label text-on-surface-variant">{org.slug} · {org.orgType}</p>
        </div>
        {org.status === "SUSPENDED" && (
          <span className="text-label px-2 py-0.5 rounded-full border font-medium bg-error/10 text-error border-error/30">
            SUSPENDED
          </span>
        )}
        {statusBadge(subscription?.status)}
      </div>

      {org.status === "SUSPENDED" && (
        <Alert variant="error">
          Suspended{org.suspendedAt ? ` on ${new Date(org.suspendedAt).toLocaleString()}` : ""}
          {org.suspendReason ? ` — ${org.suspendReason}` : ""}. Users can&apos;t sign in and no messages are sent.
        </Alert>
      )}

      {/* Tabs */}
      <div role="tablist" aria-label="Organization sections" className="flex gap-1 border-b border-outline-variant overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls="org-tabpanel"
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-body-lg font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t-lg",
              tab === t ? "text-on-surface border-b-2 border-primary" : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="org-tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "Overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <OrgActionsPanel
                orgId={org.id}
                orgName={org.name}
                orgStatus={org.status}
                subscription={subscription ? { status: subscription.status, planId: subscription.planId } : null}
              />
            </div>
            {/* Subscription card */}
            <section className="bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-3">
              <h2 className="flex items-center gap-2 text-body-lg font-medium text-on-surface">
                <CreditCard className="h-4 w-4" aria-hidden /> Subscription
              </h2>
              {subscription ? (
                <dl className="space-y-2 text-body-lg">
                  <div className="flex justify-between"><dt className="text-on-surface-variant">Plan</dt><dd className="text-on-surface">{subscription.plan?.name}</dd></div>
                  <div className="flex justify-between"><dt className="text-on-surface-variant">Status</dt><dd>{statusBadge(subscription.status)}</dd></div>
                  <div className="flex justify-between"><dt className="text-on-surface-variant">Billing</dt><dd className="text-on-surface">{subscription.billingCycle}</dd></div>
                  <div className="flex justify-between"><dt className="text-on-surface-variant">Price</dt><dd className="text-on-surface">{formatMoney(subscription.priceInCents, subscription.currency)}</dd></div>
                  {subscription.trialEndsAt && (
                    <div className="flex justify-between"><dt className="text-on-surface-variant">Trial ends</dt><dd className="text-on-surface">{new Date(subscription.trialEndsAt).toLocaleDateString()}</dd></div>
                  )}
                  <div className="flex justify-between"><dt className="text-on-surface-variant">Period ends</dt><dd className="text-on-surface">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</dd></div>
                </dl>
              ) : (
                <p className="text-body-lg text-on-surface-variant">No subscription</p>
              )}
            </section>

            {/* Counts card */}
            <section className="bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-3">
              <h2 className="flex items-center gap-2 text-body-lg font-medium text-on-surface">
                <Activity className="h-4 w-4" aria-hidden /> Activity
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Users", value: users?.length },
                  { label: "Contacts", value: counts?.contacts },
                  { label: "Campaigns", value: counts?.campaigns },
                  { label: "Messages", value: counts?.messages },
                  { label: "Tickets", value: counts?.helpTickets },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-surface-container rounded-lg p-3">
                    <div className="text-title font-semibold text-on-surface">{value ?? 0}</div>
                    <div className="text-label text-on-surface-variant">{label}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "WhatsApp" && <MessagingHealthPanel orgId={org.id} />}

        {tab === "Usage" && (
          <section className="bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-4 max-w-2xl">
            <h2 className="flex items-center gap-2 text-body-lg font-medium text-on-surface">
              <Gauge className="h-4 w-4" aria-hidden /> Usage this billing period
            </h2>
            {usageRecords?.length ? (
              <div className="space-y-4">
                {usageRecords.map((u: any) => (
                  <UsageMeter
                    key={u.id}
                    label={USAGE_LABELS[u.metricType] ?? u.metricType}
                    value={u.currentValue}
                    limit={u.limitValue}
                  />
                ))}
              </div>
            ) : (
              <p className="text-body-lg text-on-surface-variant">No usage recorded for the current period.</p>
            )}
          </section>
        )}

        {tab === "Billing history" && (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
            {subscriptionHistory?.length ? (
              <table className="w-full text-body-lg">
                <caption className="sr-only">Subscription history</caption>
                <thead>
                  <tr className="border-b border-outline-variant text-left">
                    <th scope="col" className="px-4 py-3 text-on-surface-variant font-medium">Plan</th>
                    <th scope="col" className="px-4 py-3 text-on-surface-variant font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 text-on-surface-variant font-medium">Price</th>
                    <th scope="col" className="px-4 py-3 text-on-surface-variant font-medium">Started</th>
                    <th scope="col" className="px-4 py-3 text-on-surface-variant font-medium">Period end</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {subscriptionHistory.map((s: any) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 text-on-surface">{s.plan?.name ?? "—"}</td>
                      <td className="px-4 py-3">{statusBadge(s.status)}</td>
                      <td className="px-4 py-3 text-on-surface">
                        {formatMoney(s.priceInCents, s.currency)} / {s.billingCycle === "YEARLY" ? "yr" : "mo"}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">{new Date(s.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{new Date(s.currentPeriodEnd).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="p-5 text-body-lg text-on-surface-variant">No subscriptions yet.</p>
            )}
          </div>
        )}

        {tab === "Users" && (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
            <table className="w-full text-body-lg">
              <caption className="sr-only">Users</caption>
              <thead>
                <tr className="border-b border-outline-variant text-left">
                  <th scope="col" className="px-4 py-3 text-on-surface-variant font-medium">Name</th>
                  <th scope="col" className="px-4 py-3 text-on-surface-variant font-medium">Email</th>
                  <th scope="col" className="px-4 py-3 text-on-surface-variant font-medium">Role</th>
                  <th scope="col" className="px-4 py-3 text-on-surface-variant font-medium">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {users?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-surface-container transition-colors">
                    <td className="px-4 py-3 text-on-surface">{u.firstName} {u.lastName}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{u.email}</td>
                    <td className="px-4 py-3"><span className="text-label bg-surface-container px-2 py-0.5 rounded text-on-surface-variant">{u.role}</span></td>
                    <td className="px-4 py-3 text-on-surface-variant">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "Tickets" && (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
            <p className="text-body-lg text-on-surface-variant">
              {counts?.helpTickets > 0
                ? <Link href={`/super-admin/tickets?orgId=${org.id}`} className="text-primary hover:underline">View {counts.helpTickets} tickets for this org →</Link>
                : "No tickets for this organization"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
