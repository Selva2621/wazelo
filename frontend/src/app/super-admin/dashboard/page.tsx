"use client";

import {
  Building2, CreditCard, Clock, AlertCircle,
  TrendingUp, LifeBuoy, ArrowUpRight, ArrowDownRight,
  ChevronRight, RefreshCw, Minus,
} from "lucide-react";
import { useSAStats, useSAOrgs } from "@/hooks/use-super-admin";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";

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
        <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-on-surface tabular-nums">{value}</span>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
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

function ActivityRow({ color, text, time }: { color: string; text: string; time: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-on-surface leading-snug">{text}</p>
        <p className="text-xs text-on-surface-variant mt-0.5">{time}</p>
      </div>
    </div>
  );
}

// ─── Subscription bar ─────────────────────────────────────────────────────────

function SubBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
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

  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const totalSubs = (stats?.activeSubscriptions ?? 0) + (stats?.trialSubscriptions ?? 0) + (stats?.expiredSubscriptions ?? 0);

  const statCards: StatCardProps[] = [
    {
      label: "Total Organizations",
      value: stats?.totalOrgs ?? "—",
      icon: Building2,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10",
      trend: { value: `${stats?.newOrgsLast30Days ?? 0} this month`, up: (stats?.newOrgsLast30Days ?? 0) > 0 ? true : null },
    },
    {
      label: "Active Subscriptions",
      value: stats?.activeSubscriptions ?? "—",
      icon: CreditCard,
      iconColor: "text-success",
      iconBg: "bg-success/10",
      trend: { value: "Active", up: true },
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
      trend: { value: "Churned", up: false },
    },
    {
      label: "Monthly Revenue",
      value: stats?.mrr ? `₹${(stats.mrr / 100).toLocaleString("en-IN")}` : "₹0",
      icon: TrendingUp,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      trend: { value: "MRR", up: (stats?.mrr ?? 0) > 0 ? true : null },
    },
    {
      label: "Open Tickets",
      value: stats?.openTickets ?? "—",
      icon: LifeBuoy,
      iconColor: "text-purple-400",
      iconBg: "bg-purple-500/10",
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
          <h1 className="text-xl font-bold text-on-surface tracking-tight">Platform Dashboard</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">Overview of all organizations and platform activity</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-on-surface-variant bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-lg">{today}</span>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface bg-surface-container-low border border-outline-variant hover:border-outline-variant/70 px-3 py-1.5 rounded-lg transition-all"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Bottom two-col */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">

        {/* Recent Organizations */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
            <h2 className="text-sm font-semibold text-on-surface">Recent Organizations</h2>
            <Link href="/super-admin/organizations" className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {orgsLoading ? (
            <div className="flex items-center justify-center h-24"><Spinner className="text-primary" /></div>
          ) : orgsData?.orgs?.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-10">No organizations yet</p>
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
                      <span className="text-xs font-bold text-primary">{org.name?.[0]?.toUpperCase() ?? "O"}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">{org.name}</p>
                      <p className="text-xs text-on-surface-variant truncate">{org.slug} · {org.userCount ?? 0} users</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {org.subscription ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        org.subscription.status === "ACTIVE" ? "bg-success/10 text-success" :
                        org.subscription.status === "TRIAL" ? "bg-warning/10 text-warning" :
                        org.subscription.status === "PAST_DUE" ? "bg-orange-500/10 text-orange-400" :
                        "bg-surface-container text-on-surface-variant"
                      }`}>
                        {org.subscription.status}
                      </span>
                    ) : (
                      <span className="text-xs text-on-surface-variant/50">No plan</span>
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
            <h2 className="text-sm font-semibold text-on-surface mb-1">Platform Activity</h2>
            <p className="text-xs text-on-surface-variant mb-3">Recent events across all orgs</p>
            <div className="divide-y divide-outline-variant/40">
              <ActivityRow color="bg-success" text="New org signup: Acme Corp joined" time="2h ago" />
              <ActivityRow color="bg-primary" text="TechStart upgraded to Growth plan" time="5h ago" />
              <ActivityRow color="bg-purple-400" text="Support ticket #1042 resolved" time="8h ago" />
              <ActivityRow color="bg-blue-400" text="Payment ₹4,200 received from BuildCo" time="1d ago" />
              <ActivityRow color="bg-warning" text="FreeOrg trial period expired" time="2d ago" />
            </div>
          </div>

          {/* Subscription breakdown */}
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-on-surface">Subscription Breakdown</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">{totalSubs} total subscriptions</p>
            </div>
            <div className="space-y-3">
              <SubBar label="Active" count={stats?.activeSubscriptions ?? 0} total={totalSubs} color="bg-primary" />
              <SubBar label="Trial" count={stats?.trialSubscriptions ?? 0} total={totalSubs} color="bg-warning" />
              <SubBar label="Expired / Cancelled" count={stats?.expiredSubscriptions ?? 0} total={totalSubs} color="bg-error" />
            </div>
            <Link href="/super-admin/subscriptions" className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors mt-1">
              View all subscriptions <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
