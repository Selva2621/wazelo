"use client";

import {
  Building2, CreditCard, Clock, AlertCircle,
  TrendingUp, LifeBuoy, ArrowUpRight, ArrowDownRight,
  ChevronRight, RefreshCw, Minus,
} from "lucide-react";
import { useSAStats, useSAOrgs, useSAActivity, useSAGrowth } from "@/hooks/use-super-admin";
import { MonthlyBars } from "@/components/super-admin/monthly-bars";
import type { PlatformActivityItem } from "@/lib/api/super-admin";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(iso).toLocaleDateString();
}

function activityColor(item: PlatformActivityItem): string {
  if (item.type === "ORG_SIGNUP") return "bg-success";
  if (item.type === "TICKET") return "bg-chart-5";
  if (item.status === "ACTIVE") return "bg-primary";
  if (item.status === "EXPIRED" || item.status === "CANCELLED") return "bg-error";
  return "bg-warning";
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  trend?: { value: string; up: boolean | null };
}

function StatCard({ label, value, icon: Icon, iconColor, iconBg, trend }: StatCardProps) {
  return (
    <div className="group bg-surface-container-low border border-outline-variant hover:border-outline-variant/70 rounded-xl p-5 transition-all duration-200 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <span className="text-label font-medium text-on-surface-variant uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-headline font-semibold text-on-surface tabular-nums">{value}</span>
        {trend && (
          <span className={`flex items-center gap-0.5 text-label font-medium px-2 py-0.5 rounded-full ${
            trend.up === true ? "bg-success/10 text-success" :
            trend.up === false ? "bg-error/10 text-error" :
            "bg-surface-container text-on-surface-variant"
          }`}>
            {trend.up === true ? <ArrowUpRight className="h-3 w-3" /> :
             trend.up === false ? <ArrowDownRight className="h-3 w-3" /> :
             <Minus className="h-3 w-3" />}
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Activity row ─────────────────────────────────────────────────────────────

function ActivityRow({ item }: { item: PlatformActivityItem }) {
  const body = (
    <>
      <div aria-hidden className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${activityColor(item)}`} />
      <div className="flex-1 min-w-0">
        <p className="text-body-lg text-on-surface leading-snug">{item.text}</p>
        <p className="text-label text-on-surface-variant mt-0.5">
          <time dateTime={item.at}>{timeAgo(item.at)}</time>
        </p>
      </div>
    </>
  );
  return (
    <li>
      {item.orgId ? (
        <Link href={`/super-admin/organizations/${item.orgId}`} className="flex items-start gap-3 py-2.5 hover:bg-surface-container rounded-lg -mx-2 px-2">
          {body}
        </Link>
      ) : (
        <div className="flex items-start gap-3 py-2.5">{body}</div>
      )}
    </li>
  );
}

// ─── Subscription bar ─────────────────────────────────────────────────────────

function SubBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-label">
        <span className="text-on-surface-variant">{label}</span>
        <span className="text-on-surface tabular-nums font-medium">{count}</span>
      </div>
      <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const { data: stats, isLoading: statsLoading, refetch } = useSAStats();
  const { data: orgsData, isLoading: orgsLoading } = useSAOrgs({ limit: 5 });
  const { data: activity, isLoading: activityLoading, refetch: refetchActivity } = useSAActivity(8);
  const { data: growth } = useSAGrowth(12);
  // One revenue chart per currency — amounts in different currencies are never added together
  const revenueCurrencies = [...new Set((growth ?? []).flatMap((g) => Object.keys(g.revenue)))].sort();

  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const totalSubs =
    (stats?.activeSubscriptions ?? 0) +
    (stats?.trialSubscriptions ?? 0) +
    (stats?.pastDueSubscriptions ?? 0) +
    (stats?.expiredSubscriptions ?? 0);
  // Revenue is per currency; the card shows the largest, the rest are listed under it
  const [primaryRevenue, ...otherRevenue] = stats?.revenue ?? [];
  // revenue[] counts ACTIVE subscriptions on priced plans only; the rest are on free plans
  const paidActive = (stats?.revenue ?? []).reduce((n, r) => n + r.payingSubscriptions, 0);
  const freeActive = Math.max(0, (stats?.activeSubscriptions ?? 0) - paidActive);

  const statCards: StatCardProps[] = [
    {
      label: "Total Organizations",
      value: stats?.totalOrgs ?? "—",
      icon: Building2,
      iconColor: "text-info",
      iconBg: "bg-info/10",
      trend: { value: `${stats?.newOrgsLast30Days ?? 0} this month`, up: (stats?.newOrgsLast30Days ?? 0) > 0 ? true : null },
    },
    {
      label: "Active Subscriptions",
      value: stats?.activeSubscriptions ?? "—",
      icon: CreditCard,
      iconColor: "text-success",
      iconBg: "bg-success/10",
      trend: { value: `${paidActive} paid · ${freeActive} free`, up: paidActive > 0 ? true : null },
    },
    {
      label: "Trial Accounts",
      value: stats?.trialSubscriptions ?? "—",
      icon: Clock,
      iconColor: "text-warning",
      iconBg: "bg-warning/10",
      trend: { value: "In trial", up: null },
    },
    {
      label: "Expired / Cancelled",
      value: stats?.expiredSubscriptions ?? "—",
      icon: AlertCircle,
      iconColor: "text-error",
      iconBg: "bg-error/10",
      trend: {
        value: `${stats?.churnedLast30Days ?? 0} in 30 days`,
        up: (stats?.churnedLast30Days ?? 0) > 0 ? false : null,
      },
    },
    {
      label: "MRR",
      value: primaryRevenue ? formatMoney(primaryRevenue.mrrCents, primaryRevenue.currency) : "—",
      icon: TrendingUp,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      trend: {
        value: primaryRevenue
          ? `ARR ${formatMoney(primaryRevenue.arrCents, primaryRevenue.currency)}`
          : "No paying customers",
        up: primaryRevenue ? true : null,
      },
    },
    {
      label: "Open Tickets",
      value: stats?.openTickets ?? "—",
      icon: LifeBuoy,
      iconColor: "text-chart-5",
      iconBg: "bg-chart-5/10",
      trend: { value: (stats?.openTickets ?? 0) > 0 ? "Needs attention" : "All clear", up: (stats?.openTickets ?? 0) > 0 ? false : null },
    },
  ];

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-title font-semibold text-on-surface tracking-tight">Platform Dashboard</h1>
          <p className="text-body-lg text-on-surface-variant mt-0.5">Overview of all organizations and platform activity</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-label text-on-surface-variant bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-lg">{today}</span>
          <Button variant="secondary" size="sm"
            onClick={() => {
              refetch();
              refetchActivity();
            }}
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
      {otherRevenue.length > 0 && (
        <p className="text-label text-on-surface-variant -mt-2">
          Also MRR in other currencies:{" "}
          {otherRevenue.map((r) => formatMoney(r.mrrCents, r.currency)).join(" · ")}
        </p>
      )}

      {/* Growth — small multiples, one series each */}
      {growth && (
        <section aria-labelledby="growth-heading" className="space-y-3">
          <h2 id="growth-heading" className="text-body-lg font-semibold text-on-surface">
            Growth · last 12 months
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MonthlyBars
              title="New organizations"
              unit="new organizations"
              points={growth.map((g) => ({ month: g.month, value: g.newOrgs }))}
            />
            <MonthlyBars
              title="New paying customers"
              unit="made their first payment"
              points={growth.map((g) => ({ month: g.month, value: g.newPaying }))}
            />
            <MonthlyBars
              title="Churned"
              unit="cancelled or expired"
              points={growth.map((g) => ({ month: g.month, value: g.churned }))}
            />
            {revenueCurrencies.map((currency) => (
              <MonthlyBars
                key={currency}
                title={`Revenue collected (${currency})`}
                unit={`collected in ${currency}`}
                format={(v) => formatMoney(v, currency)}
                points={growth.map((g) => ({ month: g.month, value: g.revenue[currency] ?? 0 }))}
              />
            ))}
          </div>
          {revenueCurrencies.length === 0 && (
            <p className="text-label text-on-surface-variant">No payments collected in the last 12 months.</p>
          )}
        </section>
      )}

      {/* Bottom two-col */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">

        {/* Recent Organizations */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
            <h2 className="text-body-lg font-semibold text-on-surface">Recent Organizations</h2>
            <Link href="/super-admin/organizations" className="text-label text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {orgsLoading ? (
            <div className="flex items-center justify-center h-24"><Spinner className="text-primary" /></div>
          ) : orgsData?.orgs?.length === 0 ? (
            <p className="text-body-lg text-on-surface-variant text-center py-10">No organizations yet</p>
          ) : (
            <div className="divide-y divide-outline-variant/40">
              {orgsData?.orgs?.map((org: any) => (
                <Link
                  key={org.id}
                  href={`/super-admin/organizations/${org.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-container transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-label font-semibold text-primary">{org.name?.[0]?.toUpperCase() ?? "O"}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-body-lg font-medium text-on-surface truncate">{org.name}</p>
                      <p className="text-label text-on-surface-variant truncate">{org.slug} · {org.userCount ?? 0} users</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {org.subscription ? (
                      <span className={`text-label px-2 py-0.5 rounded-full font-medium ${
                        org.subscription.status === "ACTIVE" ? "bg-success/10 text-success" :
                        org.subscription.status === "TRIAL" ? "bg-warning/10 text-warning" :
                        org.subscription.status === "PAST_DUE" ? "bg-warning/10 text-warning" :
                        "bg-surface-container text-on-surface-variant"
                      }`}>
                        {org.subscription.status}
                      </span>
                    ) : (
                      <span className="text-label text-on-surface-variant/50">No plan</span>
                    )}
                    <ChevronRight className="h-3.5 w-3.5 text-on-surface-variant/40 group-hover:text-on-surface-variant transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Activity feed */}
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
            <h2 className="text-body-lg font-semibold text-on-surface mb-1">Platform Activity</h2>
            <p className="text-label text-on-surface-variant mb-3">Recent events across all orgs</p>
            {activityLoading ? (
              <div className="flex justify-center py-6" role="status">
                <Spinner className="text-primary" />
                <span className="sr-only">Loading activity…</span>
              </div>
            ) : !activity?.length ? (
              <p className="text-body-lg text-on-surface-variant py-6 text-center">No activity yet</p>
            ) : (
              <ul className="divide-y divide-outline-variant/40">
                {activity.map((item) => (
                  <ActivityRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </div>

          {/* Subscription breakdown */}
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-body-lg font-semibold text-on-surface">Subscription Breakdown</h2>
              <p className="text-label text-on-surface-variant mt-0.5">{totalSubs} total subscriptions</p>
            </div>
            <div className="space-y-3">
              <SubBar label="Active" count={stats?.activeSubscriptions ?? 0} total={totalSubs} color="bg-primary" />
              <SubBar label="Trial" count={stats?.trialSubscriptions ?? 0} total={totalSubs} color="bg-warning" />
              <SubBar label="Past due / grace" count={stats?.pastDueSubscriptions ?? 0} total={totalSubs} color="bg-warning" />
              <SubBar label="Expired / Cancelled" count={stats?.expiredSubscriptions ?? 0} total={totalSubs} color="bg-error" />
            </div>
            <Link href="/super-admin/subscriptions" className="flex items-center gap-1 text-label text-primary hover:text-primary/80 transition-colors mt-1">
              View all subscriptions <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
