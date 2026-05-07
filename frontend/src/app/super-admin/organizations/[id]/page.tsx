"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CreditCard, Activity } from "lucide-react";
import { useSAOrg } from "@/hooks/use-super-admin";
import { Spinner } from "@/components/ui/spinner";

const TABS = ["Overview", "Users", "Tickets"] as const;
type Tab = typeof TABS[number];

function statusBadge(status?: string) {
  if (!status) return null;
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-500/10 text-green-400 border-green-800",
    TRIAL: "bg-yellow-500/10 text-yellow-400 border-yellow-800",
    PAST_DUE: "bg-orange-500/10 text-orange-400 border-orange-800",
    EXPIRED: "bg-red-500/10 text-red-400 border-red-800",
    CANCELLED: "bg-surface-container text-on-surface-variant border-outline-variant",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors[status] ?? "bg-surface-container text-on-surface-variant border-outline-variant"}`}>
      {status}
    </span>
  );
}

export default function OrgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useSAOrg(id);
  const [tab, setTab] = useState<Tab>("Overview");

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner className="text-primary" /></div>;
  if (!data) return <div className="p-6 text-on-surface-variant">Organization not found</div>;

  const { org, subscription, users, counts } = data;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/super-admin/organizations" className="text-on-surface-variant hover:text-on-surface">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-on-surface">{org.name}</h1>
          <p className="text-xs text-on-surface-variant">{org.slug} · {org.orgType}</p>
        </div>
        {statusBadge(subscription?.status)}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-outline-variant">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? "text-on-surface border-b-2 border-primary" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Subscription card */}
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-on-surface">
              <CreditCard className="h-4 w-4" /> Subscription
            </div>
            {subscription ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-on-surface-variant">Plan</span><span className="text-on-surface">{subscription.plan?.name}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Status</span>{statusBadge(subscription.status)}</div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Billing</span><span className="text-on-surface">{subscription.billingCycle}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Price</span><span className="text-on-surface">₹{(subscription.priceInCents / 100).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Period ends</span><span className="text-on-surface">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span></div>
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">No active subscription</p>
            )}
          </div>

          {/* Counts card */}
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-on-surface">
              <Activity className="h-4 w-4" /> Activity
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Users", value: users?.length },
                { label: "Contacts", value: counts?.contacts },
                { label: "Campaigns", value: counts?.campaigns },
                { label: "Messages", value: counts?.messages },
                { label: "Tickets", value: counts?.helpTickets },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface-container rounded-lg p-3">
                  <div className="text-lg font-bold text-on-surface">{value ?? 0}</div>
                  <div className="text-xs text-on-surface-variant">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "Users" && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-left">
                <th className="px-4 py-3 text-on-surface-variant font-medium">Name</th>
                <th className="px-4 py-3 text-on-surface-variant font-medium">Email</th>
                <th className="px-4 py-3 text-on-surface-variant font-medium">Role</th>
                <th className="px-4 py-3 text-on-surface-variant font-medium">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {users?.map((u: any) => (
                <tr key={u.id} className="hover:bg-surface-container transition-colors">
                  <td className="px-4 py-3 text-on-surface">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{u.email}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-surface-container px-2 py-0.5 rounded text-on-surface-variant">{u.role}</span></td>
                  <td className="px-4 py-3 text-on-surface-variant">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Tickets" && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
          <p className="text-sm text-on-surface-variant">
            {counts?.helpTickets > 0
              ? <Link href={`/super-admin/tickets?orgId=${org.id}`} className="text-primary hover:underline">View {counts.helpTickets} tickets for this org →</Link>
              : "No tickets for this organization"}
          </p>
        </div>
      )}
    </div>
  );
}
