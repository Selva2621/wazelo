"use client";

import { useState, useMemo } from "react";
import { Target } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Tabs } from "@/components/ui/tabs";
import { SearchInput } from "@/components/ui/search-input";
import { PeriodSelector } from "@/components/analytics/period-selector";
import { LeadAdsStatsCards } from "@/components/lead-ads/lead-ads-stats-cards";
import { LeadAdsPlatformBreakdown } from "@/components/lead-ads/lead-ads-platform-breakdown";
import { LeadAdsTopCampaigns } from "@/components/lead-ads/lead-ads-top-campaigns";
import { LeadAdsDailyChart } from "@/components/lead-ads/lead-ads-daily-chart";
import { LeadAdsEntryTable } from "@/components/lead-ads/lead-ads-entry-table";
import { LeadAdsWebhookCard } from "@/components/lead-ads/lead-ads-webhook-card";
import {
  useLeadAdEntries,
  useLeadAdAnalytics,
  useLeadAdConfig,
  useRetryLeadAd,
} from "@/hooks/use-lead-ads";
import { useLeadAdsSocket } from "@/hooks/use-lead-ads-socket";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuthStore } from "@/stores/auth-store";
import type { AnalyticsPeriod } from "@/lib/types/analytics";
import type { LeadAdPlatform, LeadAdStatus } from "@/lib/types/lead-ads";
import { PAGE_SIZE } from "@/lib/constants";

type StatusTab = "all" | "COMPLETED" | "FAILED" | "PENDING";

function periodToDateRange(period: AnalyticsPeriod): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  switch (period) {
    case "day":
      start.setHours(0, 0, 0, 0);
      break;
    case "week":
      start.setDate(start.getDate() - 7);
      break;
    case "month":
    default:
      start.setDate(start.getDate() - 30);
      break;
  }
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export default function LeadAdsPage() {
  usePageTitle("Lead Ads");
  useLeadAdsSocket();

  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";

  const [period, setPeriod] = useState<AnalyticsPeriod>("month");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [platformFilter, setPlatformFilter] = useState<LeadAdPlatform | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const dateRange = useMemo(() => periodToDateRange(period), [period]);

  const { data: analytics, isLoading: analyticsLoading } = useLeadAdAnalytics(dateRange);

  const entryParams = useMemo(() => ({
    ...(statusTab !== "all" && { status: statusTab as LeadAdStatus }),
    ...(platformFilter !== "all" && { platform: platformFilter }),
    ...(search && { search }),
    ...dateRange,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  }), [statusTab, platformFilter, search, dateRange, page]);

  const {
    data: entriesData,
    isLoading: entriesLoading,
    isError,
    refetch,
  } = useLeadAdEntries(entryParams);

  const { data: config } = useLeadAdConfig();
  const retryLead = useRetryLeadAd();

  const statusTabs = useMemo(() => [
    { id: "all", label: "All" },
    { id: "COMPLETED", label: "Completed" },
    { id: "FAILED", label: "Failed" },
    { id: "PENDING", label: "Pending" },
  ], []);

  const platformTabs = useMemo(() => [
    { id: "all", label: "All Platforms" },
    { id: "facebook", label: "Facebook" },
    { id: "instagram", label: "Instagram" },
    { id: "whatsapp", label: "WhatsApp" },
  ], []);

  const isEmpty = analytics && analytics.totalLeads === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* ─── Header ─── */}
      <div className="shrink-0 px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h1 className="text-[18px] font-semibold text-on-surface">
            Lead Ads
          </h1>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
        {/* Loading */}
        {analyticsLoading && !analytics && (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="rounded-xl bg-error/10 border border-error/20 p-4 text-center">
            <p className="text-[13px] text-error mb-2">
              Failed to load lead ads data
            </p>
            <button
              onClick={() => refetch()}
              className="text-[12px] text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {isEmpty && !analyticsLoading && (
          <EmptyState
            icon={<Target className="h-12 w-12" />}
            title="No leads captured yet"
            description="Connect your Meta ad campaigns and leads will appear here in real-time as customers fill out your forms."
          />
        )}

        {analytics && !isEmpty && (
          <>
            {/* ─── KPI Cards ─── */}
            <LeadAdsStatsCards analytics={analytics} isLoading={analyticsLoading} />

            {/* ─── Analytics Row: Platform + Campaigns side-by-side ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <LeadAdsPlatformBreakdown analytics={analytics} />
              <LeadAdsTopCampaigns analytics={analytics} />
            </div>

            {/* ─── Daily Trend Chart ─── */}
            {analytics.byDay.length > 0 && (
              <LeadAdsDailyChart analytics={analytics} />
            )}

            {/* ─── Filters Toolbar ─── */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px] max-w-xs">
                <SearchInput
                  placeholder="Search by name, campaign..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <Tabs
                tabs={platformTabs}
                activeTab={platformFilter}
                onTabChange={(val) => { setPlatformFilter(val as LeadAdPlatform | "all"); setPage(1); }}
              />
              <Tabs
                tabs={statusTabs}
                activeTab={statusTab}
                onTabChange={(val) => { setStatusTab(val as StatusTab); setPage(1); }}
              />
            </div>

            {/* ─── Entries Table ─── */}
            {entriesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : entriesData ? (
              <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 overflow-hidden">
                <LeadAdsEntryTable
                  entries={entriesData.data}
                  onRetry={isAdmin ? (id) => retryLead.mutate(id) : undefined}
                  isRetrying={retryLead.isPending}
                />
                <Pagination
                  page={page}
                  totalPages={Math.ceil(entriesData.total / PAGE_SIZE)}
                  total={entriesData.total}
                  onPageChange={setPage}
                />
              </div>
            ) : null}
          </>
        )}

        {/* ─── Webhook Setup (admin only, always visible) ─── */}
        {isAdmin && config && (
          <LeadAdsWebhookCard config={config} />
        )}
      </div>
    </div>
  );
}
