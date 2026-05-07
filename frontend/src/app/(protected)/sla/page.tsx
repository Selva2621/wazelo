"use client";

import { useState, useMemo, useEffect } from "react";
import { ShieldCheck, Settings2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useSlaPerformance,
  useSlaBreaches,
  useSlaPolicies,
  useAcknowledgeSlaBrech,
} from "@/hooks/use-sla";
import { useTeamPerformance } from "@/hooks/use-analytics";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { PeriodSelector } from "@/components/analytics/period-selector";
import { PAGE_SIZE } from "@/lib/constants";
import { SlaKpiCards } from "@/components/sla/sla-kpi-cards";
import { SlaBreachTable } from "@/components/sla/sla-breach-table";
import { SlaTeamTable } from "@/components/sla/sla-team-table";
import { SlaResponseChart } from "@/components/sla/sla-response-chart";
import type { AnalyticsPeriod } from "@/lib/types/analytics";

function periodToDates(period: AnalyticsPeriod) {
  const now = new Date();
  let startDate: Date;
  switch (period) {
    case "day":
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      break;
    case "week":
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "month":
    default:
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      break;
  }
  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  };
}

export default function SlaPage() {
  usePageTitle("SLA Tracking");
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState<AnalyticsPeriod>("week");
  const [breachPage, setBreachPage] = useState(1);

  const role = user?.role ?? "EMPLOYEE";
  const isManager = role === "ADMIN" || role === "MANAGER";
  const isAdmin = role === "ADMIN";

  const dates = useMemo(() => periodToDates(period), [period]);

  const perfParams = useMemo(
    () => ({ startDate: dates.startDate, endDate: dates.endDate }),
    [dates],
  );

  const { data: performance, isLoading: perfLoading, isError: perfError, refetch: refetchPerf } =
    useSlaPerformance(perfParams);

  const { data: breachData } = useSlaBreaches({
    status: "ACTIVE",
    startDate: dates.startDate,
    endDate: dates.endDate,
    limit: 50,
  });

  const { data: allBreaches } = useSlaBreaches({
    startDate: dates.startDate,
    endDate: dates.endDate,
    limit: PAGE_SIZE,
    offset: (breachPage - 1) * PAGE_SIZE,
  });

  // Reset breach page when period changes
  useEffect(() => { setBreachPage(1); }, [period]);

  const { data: policies } = useSlaPolicies();

  const teamParams = useMemo(
    () => ({
      period,
      timezoneOffsetHours: Math.round(new Date().getTimezoneOffset() / -60),
    }),
    [period],
  );
  const { data: teamData } = useTeamPerformance(isManager ? teamParams : undefined);

  const acknowledgeMutation = useAcknowledgeSlaBrech();

  const handleAcknowledge = (breachId: string) => {
    acknowledgeMutation.mutate(breachId);
  };

  const activeBreachCount = breachData?.total ?? 0;

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-[18px] font-semibold text-on-surface">
            SLA Tracking
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <a
              href="/settings?tab=sla"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-[13px] font-medium hover:bg-primary/90 transition-colors"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Manage Policies
            </a>
          )}
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
        {perfLoading && (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        )}

        {perfError && (
          <div className="rounded-xl bg-error/10 border border-error/20 p-4 text-center">
            <p className="text-[13px] text-error mb-2">
              Failed to load SLA data
            </p>
            <button
              onClick={() => refetchPerf()}
              className="text-[12px] text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {performance && performance.compliance.total === 0 && (
          <EmptyState
            icon={<ShieldCheck className="h-12 w-12" />}
            title="No SLA data yet"
            description={
              (policies?.length ?? 0) === 0
                ? "Create SLA policies first to start tracking response times."
                : "Policies are active. SLA data will appear once conversations come in."
            }
            actionLabel={(policies?.length ?? 0) === 0 && isAdmin ? "Create SLA Policy" : undefined}
            onAction={(policies?.length ?? 0) === 0 && isAdmin ? () => window.location.href = "/settings?tab=sla" : undefined}
          />
        )}

        {performance && performance.compliance.total > 0 && (
          <>
            {/* KPI Cards */}
            <SlaKpiCards
              data={performance}
              activeBreaches={activeBreachCount}
            />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Response Time vs SLA chart */}
              {policies && (
                <SlaResponseChart
                  performance={performance}
                  policies={policies}
                />
              )}

              {/* Breach Table */}
              {allBreaches && policies && (
                <div className="flex flex-col gap-3">
                  <SlaBreachTable
                    breaches={allBreaches.data}
                    policies={policies}
                    onAcknowledge={
                      isManager ? handleAcknowledge : undefined
                    }
                    isAcknowledging={acknowledgeMutation.isPending}
                  />
                  {Math.ceil((allBreaches.total ?? 0) / PAGE_SIZE) > 1 && (
                    <Pagination
                      page={breachPage}
                      totalPages={Math.ceil((allBreaches.total ?? 0) / PAGE_SIZE)}
                      total={allBreaches.total ?? 0}
                      onPageChange={setBreachPage}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Team SLA Performance (Manager/Admin only) */}
            {isManager && teamData && (
              <SlaTeamTable
                performance={performance}
                users={teamData.users.map((u) => ({
                  id: u.userId,
                  firstName: u.firstName,
                  lastName: u.lastName,
                }))}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
