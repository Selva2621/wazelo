"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { useAuthStore } from "@/stores/auth-store";
import { usePageTitle } from "@/hooks/use-page-title";
import { useOrgSettings } from "@/hooks/use-settings";
import { useDashboardAnalytics, useTeamPerformance } from "@/hooks/use-analytics";
import { Button } from "@/components/ui/button";
import { PeriodSelector } from "@/components/analytics/period-selector";
import { ProductFilterSelect } from "@/components/ui/product-filter-select";
import { AnalyticsKpiCards } from "@/components/analytics/analytics-kpi-cards";
import { MessageVolumeChart } from "@/components/analytics/message-volume-chart";
import { ResponseTimeChart } from "@/components/analytics/response-time-chart";
import { ConversionFunnel } from "@/components/analytics/conversion-funnel";
import { PeakHoursChart } from "@/components/analytics/peak-hours-chart";
import { TeamPerformanceTable } from "@/components/analytics/team-performance-table";
import { CampaignSummaryCards } from "@/components/analytics/campaign-summary-cards";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import type { AnalyticsPeriod } from "@/lib/types/analytics";

const PERIOD_COPY: Record<AnalyticsPeriod, string> = {
  day: "today",
  week: "this week",
  month: "this month",
  custom: "in the selected range",
};

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[124px] animate-pulse rounded-2xl bg-surface-container-lowest" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-2xl bg-surface-container-lowest" />
        <div className="h-72 animate-pulse rounded-2xl bg-surface-container-lowest" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  usePageTitle("Dashboard");
  const router = useRouter();
  const userOrgType = useAuthStore((s) => s.user?.orgType);
  const { data: orgSettings, isError: orgError } = useOrgSettings();
  // Login/refresh already return orgType, so this is usually known on the first render;
  // org settings is the fallback.
  const orgType = userOrgType ?? orgSettings?.orgType;
  const isFreelancer = orgType === "FREELANCER";

  // Freelancers have their own dashboard
  useEffect(() => {
    if (isFreelancer) router.replace("/dashboard/freelancer");
  }, [isFreelancer, router]);

  // Until the org type is known (or for freelancers, who are leaving), mount nothing: the
  // team dashboard would flash its skeleton and fire analytics requests nobody sees.
  if (isFreelancer || (!orgType && !orgError)) return null;
  return <TeamDashboard />;
}

function TeamDashboard() {
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

  return (
    <div className="space-y-5 px-4 pb-10 pt-4 lg:px-6">
      {/* Hero */}
      <PageHeader
        title={`Welcome back${user?.firstName ? `, ${user.firstName}` : ""}`}
        description={`Performance ${PERIOD_COPY[period]}`}
        actions={
          <>
            <PeriodSelector value={period} onChange={setPeriod} />
            <ProductFilterSelect value="" onChange={() => {}} />
          </>
        }
      />

      <SetupChecklist />

      {isLoading && <DashboardSkeleton />}

      {isError && (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-error-container p-6 text-center">
          <p className="text-body text-error">Analytics couldn&apos;t be loaded.</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {data && (
        <>
          <AnalyticsKpiCards data={data} isManager={isManager} />

          <div data-tour="dash-charts" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <MessageVolumeChart series={data.messageVolume.series} period={period} />
            <ResponseTimeChart series={data.responseTime.series} period={period} />
          </div>

          {isManager && (
            <>
              <div data-tour="dash-manager" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {data.conversionFunnel && <ConversionFunnel data={data.conversionFunnel} />}
                {data.peakHours && <PeakHoursChart data={data.peakHours} />}
              </div>

              {teamData && <TeamPerformanceTable data={teamData} />}

              {data.campaignSummary && <CampaignSummaryCards totals={data.campaignSummary.totals} />}
            </>
          )}
        </>
      )}
    </div>
  );
}
