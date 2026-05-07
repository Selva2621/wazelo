"use client";

import { useState, useMemo } from "react";
import { Star, MessageSquare, TrendingUp, Users } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCsatStats, useCsatSurveys } from "@/hooks/use-csat";
import { useUsers } from "@/hooks/use-users";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { PeriodSelector } from "@/components/analytics/period-selector";
import { ProductFilterSelect } from "@/components/ui/product-filter-select";
import {
  Table,
  TableHeader,
  TableHeaderRow,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import type { AnalyticsPeriod } from "@/lib/types/analytics";
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
  usePageTitle("Customer Satisfaction");
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

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-warning" />
          <h1 className="text-[18px] font-semibold text-on-surface">
            Customer Satisfaction
          </h1>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
        <ProductFilterSelect value={productFilter} onChange={setProductFilter} />
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 border-l-2 border-l-warning p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-on-surface-variant/60" />
                  <span className="text-[11px] text-on-surface-variant/60 uppercase tracking-wide">
                    Avg Rating
                  </span>
                </div>
                <p className="text-[22px] font-semibold text-on-surface tabular-nums">
                  {stats.avgRating.toFixed(1)}
                </p>
                <p className="text-[12px] text-on-surface-variant/60">out of 5.0</p>
              </div>

              <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 border-l-2 border-l-primary p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-on-surface-variant/60" />
                  <span className="text-[11px] text-on-surface-variant/60 uppercase tracking-wide">
                    Responses
                  </span>
                </div>
                <p className="text-[22px] font-semibold text-on-surface tabular-nums">
                  {stats.totalResponses}
                </p>
              </div>

              <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 border-l-2 border-l-success p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-on-surface-variant/60" />
                  <span className="text-[11px] text-on-surface-variant/60 uppercase tracking-wide">
                    Satisfied (4-5)
                  </span>
                </div>
                <p className="text-[22px] font-semibold text-success tabular-nums">
                  {stats.distribution
                    .filter((d) => d.rating !== null && d.rating >= 4)
                    .reduce((s, d) => s + d.count, 0)}
                </p>
              </div>

              <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 border-l-2 border-l-error p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-on-surface-variant/60" />
                  <span className="text-[11px] text-on-surface-variant/60 uppercase tracking-wide">
                    Dissatisfied (1-2)
                  </span>
                </div>
                <p className="text-[22px] font-semibold text-error tabular-nums">
                  {stats.distribution
                    .filter((d) => d.rating !== null && d.rating <= 2)
                    .reduce((s, d) => s + d.count, 0)}
                </p>
              </div>
            </div>

            {/* Rating Distribution + Agent Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Distribution */}
              <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5">
                <h3 className="text-[13px] font-medium text-on-surface-variant mb-4">
                  Rating Distribution
                </h3>
                <div className="space-y-2.5">
                  {[5, 4, 3, 2, 1].map((r) => {
                    const count = stats.distribution.find((d) => d.rating === r)?.count ?? 0;
                    const pct = stats.totalResponses > 0 ? (count / stats.totalResponses) * 100 : 0;
                    return (
                      <div key={r} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-16 shrink-0">
                          <span className="text-[13px] font-medium text-on-surface">{r}</span>
                          <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                        </div>
                        <div className="flex-1 h-2 rounded-full bg-surface-container overflow-hidden">
                          <div
                            className="h-full rounded-full bg-warning/60 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[12px] text-on-surface-variant tabular-nums w-10 text-right">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Agent Breakdown */}
              <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5">
                <h3 className="text-[13px] font-medium text-on-surface-variant mb-4">
                  By Agent
                </h3>
                {stats.byAgent.length === 0 ? (
                  <p className="text-[13px] text-on-surface-variant/40 text-center py-4">
                    No agent data yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {stats.byAgent.map((a) => (
                      <div key={a.agentId} className="flex items-center justify-between">
                        <span className="text-[13px] text-on-surface truncate flex-1">
                          {userMap.get(a.agentId) ?? a.agentId.slice(0, 8)}
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-warning fill-warning" />
                            <span className="text-[13px] font-semibold text-on-surface tabular-nums">
                              {a._avg.rating.toFixed(1)}
                            </span>
                          </div>
                          <span className="text-[11px] text-on-surface-variant/50 tabular-nums">
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
            {surveysLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : surveysData && surveysData.data.length > 0 ? (
              <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 overflow-hidden">
                <div className="px-5 py-3 border-b border-outline-variant/10">
                  <h3 className="text-[13px] font-medium text-on-surface-variant">
                    Recent Responses
                  </h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableHeaderRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Comment</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Status</TableHead>
                    </TableHeaderRow>
                  </TableHeader>
                  <TableBody>
                    {surveysData.data.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-[13px] text-on-surface font-medium">
                          {s.contactPhone}
                        </TableCell>
                        <TableCell className="text-[12px] text-on-surface-variant">
                          {userMap.get(s.agentId) ?? "—"}
                        </TableCell>
                        <TableCell>{renderStars(s.rating)}</TableCell>
                        <TableCell className="text-[12px] text-on-surface-variant truncate max-w-[200px]">
                          {s.comment || "—"}
                        </TableCell>
                        <TableCell className="text-[11px] text-on-surface-variant/60">
                          {new Date(s.sentAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.respondedAt ? "success" : "warning"}>
                            {s.respondedAt ? "Responded" : "Pending"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination
                  page={page}
                  totalPages={Math.ceil(surveysData.total / PAGE_SIZE)}
                  total={surveysData.total}
                  onPageChange={setPage}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
