"use client";

import { useState, useMemo } from "react";
import { Star, MessageSquare, TrendingUp, Users } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCsatStats, useCsatSurveys } from "@/hooks/use-csat";
import { useUsers } from "@/hooks/use-users";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { PeriodSelector } from "@/components/analytics/period-selector";
import { ProductFilterSelect } from "@/components/ui/product-filter-select";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { AnalyticsPeriod } from "@/lib/types/analytics";
import type { CsatSurvey } from "@/lib/types/csat";
import { PAGE_SIZE } from "@/lib/constants";

function periodToDateRange(period: AnalyticsPeriod) {
  const end = new Date();
  const start = new Date();
  switch (period) {
    case "day": start.setDate(start.getDate() - 1); break;
    case "week": start.setDate(start.getDate() - 7); break;
    case "month": default: start.setDate(start.getDate() - 30); break;
  }
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function renderStars(rating: number | null) {
  if (rating === null) return <span className="text-on-surface-variant/40">—</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= rating ? "text-warning fill-warning" : "text-on-surface-variant/20"}`}
        />
      ))}
    </div>
  );
}

export default function CsatPage() {
  usePageTitle("Customer satisfaction");
  const [period, setPeriod] = useState<AnalyticsPeriod>("month");
  const [page, setPage] = useState(1);
  const [productFilter, setProductFilter] = useState("");

  const dateRange = useMemo(() => ({
    ...periodToDateRange(period),
    ...(productFilter && { productId: productFilter }),
  }), [period, productFilter]);

  const { data: stats, isLoading: statsLoading } = useCsatStats(dateRange);
  const { data: surveysData, isLoading: surveysLoading } = useCsatSurveys({
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });
  const { data: usersData } = useUsers();
  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    usersData?.users?.forEach((u) => map.set(u.id, `${u.firstName} ${u.lastName}`));
    return map;
  }, [usersData]);

  const isEmpty = stats && stats.totalResponses === 0;

  const surveyColumns: DataTableColumn<CsatSurvey>[] = [
    {
      id: "contact",
      header: "Contact",
      cellClassName: "text-body text-on-surface font-medium",
      cell: (s) => s.contactPhone,
    },
    {
      id: "agent",
      header: "Agent",
      cellClassName: "text-label text-on-surface-variant",
      cell: (s) => userMap.get(s.agentId) ?? "—",
    },
    { id: "rating", header: "Rating", cell: (s) => renderStars(s.rating) },
    {
      id: "comment",
      header: "Comment",
      cellClassName: "text-label text-on-surface-variant truncate max-w-[200px]",
      cell: (s) => s.comment || "—",
    },
    {
      id: "sent",
      header: "Sent",
      skeleton: "short",
      cellClassName: "text-caption text-on-surface-variant/60",
      cell: (s) => new Date(s.sentAt).toLocaleDateString(),
    },
    {
      id: "status",
      header: "Status",
      skeleton: "badge",
      cell: (s) => (
        <Badge variant={s.respondedAt ? "success" : "warning"} dot>
          {s.respondedAt ? "Responded" : "Pending"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 max-lg:pt-1">
        <PageHeader
          className="max-lg:hidden"
          title="Customer satisfaction"
          actions={
            <>
              <ProductFilterSelect value={productFilter} onChange={setProductFilter} />
              <PeriodSelector value={period} onChange={setPeriod} />
            </>
          }
        />
        {/* Phones/tablets: title is in the nav bar; filters stack full width */}
        <div data-tour="csat-filters" className="flex flex-col items-stretch gap-2 lg:hidden">
          <PeriodSelector value={period} onChange={setPeriod} />
          <ProductFilterSelect value={productFilter} onChange={setProductFilter} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
        {statsLoading && (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        )}

        {isEmpty && !statsLoading && (
          <EmptyState
            icon={<Star className="h-12 w-12" />}
            title="No survey responses yet"
            description="Send CSAT surveys after conversations close to start collecting customer feedback."
          />
        )}

        {stats && !isEmpty && (
          <>
            {/* KPI Cards */}
            <div data-tour="csat-kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-4 max-lg:rounded-xl max-lg:border-outline-variant/10 max-lg:border-l-2 max-lg:border-l-warning">
                <div className="flex items-center gap-2 mb-2 lg:mb-1">
                  <Star className="h-4 w-4 text-on-surface-variant/60 lg:hidden" />
                  <span className="text-label text-on-surface-variant max-lg:text-caption max-lg:uppercase max-lg:tracking-wide max-lg:text-on-surface-variant/60">
                    Avg rating
                  </span>
                </div>
                <p className="text-headline font-semibold text-on-surface tabular-nums">
                  {stats.avgRating.toFixed(1)}
                </p>
                <p className="text-label text-on-surface-variant/60">out of 5.0</p>
              </div>

              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-4 max-lg:rounded-xl max-lg:border-outline-variant/10 max-lg:border-l-2 max-lg:border-l-primary">
                <div className="flex items-center gap-2 mb-2 lg:mb-1">
                  <MessageSquare className="h-4 w-4 text-on-surface-variant/60 lg:hidden" />
                  <span className="text-label text-on-surface-variant max-lg:text-caption max-lg:uppercase max-lg:tracking-wide max-lg:text-on-surface-variant/60">
                    Responses
                  </span>
                </div>
                <p className="text-headline font-semibold text-on-surface tabular-nums">
                  {stats.totalResponses}
                </p>
              </div>

              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-4 max-lg:rounded-xl max-lg:border-outline-variant/10 max-lg:border-l-2 max-lg:border-l-success">
                <div className="flex items-center gap-2 mb-2 lg:mb-1">
                  <TrendingUp className="h-4 w-4 text-on-surface-variant/60 lg:hidden" />
                  <span className="text-label text-on-surface-variant max-lg:text-caption max-lg:uppercase max-lg:tracking-wide max-lg:text-on-surface-variant/60">
                    Satisfied (4-5)
                  </span>
                </div>
                <p className="text-headline font-semibold text-success tabular-nums">
                  {stats.distribution
                    .filter((d) => d.rating !== null && d.rating >= 4)
                    .reduce((s, d) => s + d.count, 0)}
                </p>
              </div>

              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-4 max-lg:rounded-xl max-lg:border-outline-variant/10 max-lg:border-l-2 max-lg:border-l-error">
                <div className="flex items-center gap-2 mb-2 lg:mb-1">
                  <Users className="h-4 w-4 text-on-surface-variant/60 lg:hidden" />
                  <span className="text-label text-on-surface-variant max-lg:text-caption max-lg:uppercase max-lg:tracking-wide max-lg:text-on-surface-variant/60">
                    Dissatisfied (1-2)
                  </span>
                </div>
                <p className="text-headline font-semibold text-error tabular-nums">
                  {stats.distribution
                    .filter((d) => d.rating !== null && d.rating <= 2)
                    .reduce((s, d) => s + d.count, 0)}
                </p>
              </div>
            </div>

            {/* Rating Distribution + Agent Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Distribution */}
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-5">
                <h2 className="text-title-sm font-semibold text-on-surface mb-4">
                  Rating distribution
                </h2>
                <div className="space-y-2.5">
                  {[5, 4, 3, 2, 1].map((r) => {
                    const count = stats.distribution.find((d) => d.rating === r)?.count ?? 0;
                    const pct = stats.totalResponses > 0 ? (count / stats.totalResponses) * 100 : 0;
                    return (
                      <div key={r} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-16 shrink-0">
                          <span className="text-body font-medium text-on-surface">{r}</span>
                          <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                        </div>
                        <div className="flex-1 h-2 rounded-full bg-surface-container overflow-hidden">
                          <div
                            className="h-full rounded-full bg-warning/60 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-label text-on-surface-variant tabular-nums w-10 text-right">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Agent Breakdown */}
              <div data-tour="csat-agents" className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-5">
                <h2 className="text-title-sm font-semibold text-on-surface mb-4">
                  By agent
                </h2>
                {stats.byAgent.length === 0 ? (
                  <p className="text-body text-on-surface-variant/40 text-center py-4">
                    No agent data yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {stats.byAgent.map((a) => (
                      <div key={a.agentId} className="flex items-center justify-between">
                        <span className="text-body text-on-surface truncate flex-1">
                          {userMap.get(a.agentId) ?? a.agentId.slice(0, 8)}
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-warning fill-warning" />
                            <span className="text-body font-semibold text-on-surface tabular-nums">
                              {a._avg.rating.toFixed(1)}
                            </span>
                          </div>
                          <span className="text-caption text-on-surface-variant/50 tabular-nums">
                            {a._count.rating} reviews
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Surveys Table */}
            {(surveysLoading || (surveysData && surveysData.data.length > 0)) && (
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant overflow-hidden">
                <div className="px-5 py-3 border-b border-outline-variant">
                  <h2 className="text-title-sm font-semibold text-on-surface">
                    Recent responses
                  </h2>
                </div>
                <DataTable
                  label="Recent responses"
                  columns={surveyColumns}
                  rows={surveysData?.data ?? []}
                  rowKey={(s) => s.id}
                  rowLabel={(s) => s.contactPhone}
                  loading={surveysLoading}
                  skeletonRows={5}
                  pagination={{
                    page: page - 1,
                    pageSize: PAGE_SIZE,
                    total: surveysData?.total ?? 0,
                    onPageChange: (p) => setPage(p + 1),
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
