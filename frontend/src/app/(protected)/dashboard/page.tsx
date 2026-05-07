"use client";

import { useState, useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { usePageTitle } from "@/hooks/use-page-title";
import { useDashboardAnalytics, useTeamPerformance } from "@/hooks/use-analytics";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { PeriodSelector } from "@/components/analytics/period-selector";
import { ProductFilterSelect } from "@/components/ui/product-filter-select";
import { AnalyticsKpiCards } from "@/components/analytics/analytics-kpi-cards";
import { MessageVolumeChart } from "@/components/analytics/message-volume-chart";
import { ResponseTimeChart } from "@/components/analytics/response-time-chart";
import { ConversionFunnel } from "@/components/analytics/conversion-funnel";
import { PeakHoursChart } from "@/components/analytics/peak-hours-chart";
import { TeamPerformanceTable } from "@/components/analytics/team-performance-table";
import { CampaignSummaryCards } from "@/components/analytics/campaign-summary-cards";
import type { AnalyticsPeriod } from "@/lib/types/analytics";

export default function DashboardPage() {
  usePageTitle("Analytics");
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState<AnalyticsPeriod>("week");

  const role = user?.role ?? "EMPLOYEE";
  const isManager = role === "ADMIN" || role === "MANAGER";

  const params = useMemo(
    () => ({
      period,
      timezoneOffsetHours: Math.round(new Date().getTimezoneOffset() / -60),
    }),
    [period],
  );

  const { data, isLoading, isError, refetch } = useDashboardAnalytics(params);
  const { data: teamData } = useTeamPerformance(isManager ? params : undefined);

  const isEmpty =
    data &&
    data.messageVolume.totals.total === 0 &&
    data.responseTime.overall.totalResponses === 0 &&
    (data.conversionFunnel?.snapshot?.total ?? 0) === 0 &&
    data.campaignSummary.totals.totalCampaigns === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-[18px] font-semibold text-on-surface">
            Analytics
          </h1>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
        <ProductFilterSelect value="" onChange={() => {}} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        )}

        {isError && (
          <div className="rounded-xl bg-error/10 border border-error/20 p-4 text-center">
            <p className="text-[13px] text-error mb-2">
              Failed to load analytics data
            </p>
            <button
              onClick={() => refetch()}
              className="text-[12px] text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {isEmpty && (
          <EmptyState
            icon={<BarChart3 className="h-12 w-12" />}
            title="No analytics data yet"
            description="Start sending messages and your analytics will appear here."
          />
        )}

        {data && !isEmpty && (
          <>
            {/* KPI Cards */}
            <AnalyticsKpiCards data={data} isManager={isManager} />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <MessageVolumeChart
                series={data.messageVolume.series}
                period={period}
              />
              <ResponseTimeChart
                series={data.responseTime.series}
                period={period}
              />
            </div>

            {/* Manager/Admin Sections */}
            {isManager && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {data.conversionFunnel && (
                    <ConversionFunnel data={data.conversionFunnel} />
                  )}
                  {data.peakHours && <PeakHoursChart data={data.peakHours} />}
                </div>

                {teamData && (
                  <TeamPerformanceTable data={teamData} />
                )}

                {data.campaignSummary && (
                  <CampaignSummaryCards totals={data.campaignSummary.totals} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
