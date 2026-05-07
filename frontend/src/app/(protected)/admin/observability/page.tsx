"use client";

import { useState, useMemo } from "react";
import {
  Activity,
  Heart,
  Database,
  Radio,
  Wifi,
  AlertTriangle,
  Bell,
  Bug,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  RefreshCw,
  Clock,
  Gauge,
  Server,
} from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuthStore } from "@/stores/auth-store";
import {
  useHealth,
  useQueueHealth,
  useLatestMetrics,
  useAlertRules,
  useAlertHistory,
  useErrors,
} from "@/hooks/use-observability";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import type { HealthStatus, QueueHealth, AlertRule, AlertEvent, ErrorGroup } from "@/lib/types/observability";
import { PAGE_SIZE } from "@/lib/constants";

type ObsTab = "overview" | "queues" | "alerts" | "errors";

const STATUS_COLORS: Record<HealthStatus, string> = {
  healthy: "bg-primary",
  degraded: "bg-warning",
  unhealthy: "bg-error",
};

const STATUS_TEXT: Record<HealthStatus, string> = {
  healthy: "text-primary",
  degraded: "text-warning",
  unhealthy: "text-error",
};

export default function ObservabilityPage() {
  usePageTitle("System Observability");

  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<ObsTab>("overview");

  if (user?.role !== "ADMIN") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <ShieldAlert className="h-12 w-12 text-on-surface-variant/40 mx-auto mb-3" />
          <p className="text-[14px] text-on-surface-variant">
            You don&apos;t have permission to view system observability.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div>
        <p className="text-[12px] text-on-surface-variant mb-1">
          Admin &gt; Observability
        </p>
        <h1 className="text-2xl font-semibold text-on-surface">
          System Observability
        </h1>
        <p className="text-[13px] text-on-surface-variant mt-1">
          Monitor system health, queue status, alerts, and errors
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container/30 p-1 rounded-lg w-fit">
        {(
          [
            { id: "overview", label: "Overview", icon: Activity },
            { id: "queues", label: "Queues", icon: Server },
            { id: "alerts", label: "Alerts", icon: Bell },
            { id: "errors", label: "Errors", icon: Bug },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-surface-container text-on-surface shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "overview" && <OverviewSection />}
      {activeTab === "queues" && <QueuesSection />}
      {activeTab === "alerts" && <AlertsSection />}
      {activeTab === "errors" && <ErrorsSection />}
    </div>
  );
}

// ─── Overview Section ───────────────────────────

function OverviewSection() {
  const { data: health, isLoading: healthLoading } = useHealth();
  const { data: metrics, isLoading: metricsLoading } = useLatestMetrics();

  if (healthLoading) {
    return <SectionLoader />;
  }

  return (
    <div className="space-y-6">
      {/* System Health */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Overall Status */}
          <Card className="!p-5 col-span-1">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-3 h-3 rounded-full ${STATUS_COLORS[health.status]} animate-pulse`}
              />
              <span className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
                System Status
              </span>
            </div>
            <p
              className={`text-xl font-bold capitalize ${STATUS_TEXT[health.status]}`}
            >
              {health.status}
            </p>
            <p className="text-[11px] text-on-surface-variant/60 mt-1">
              Uptime: {formatUptime(health.uptime)}
            </p>
          </Card>

          {/* Database */}
          <HealthCheckCard
            icon={Database}
            label="Database"
            status={health.components.database.status}
            detail={
              health.components.database.latency
                ? `${health.components.database.latency}ms latency`
                : undefined
            }
          />

          {/* Queue */}
          <HealthCheckCard
            icon={Radio}
            label="Queue System"
            status={health.components.queue.status}
            detail={
              health.components.queue.latency
                ? `${health.components.queue.latency}ms latency`
                : undefined
            }
          />

          {/* WebSocket */}
          <HealthCheckCard
            icon={Wifi}
            label="WebSocket"
            status={health.components.websocket.status}
            detail={
              health.components.websocket.connections !== undefined
                ? `${health.components.websocket.connections} connection${health.components.websocket.connections !== 1 ? "s" : ""}`
                : undefined
            }
          />
        </div>
      )}

      {/* Latest Metrics */}
      {!metricsLoading && metrics && metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-5 w-5" />
              Latest Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-container/40 border-b border-outline-variant/15">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      Metric
                    </th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      Value
                    </th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      Recorded At
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m, idx) => (
                    <tr
                      key={`${m.metric}-${idx}`}
                      className="border-b border-outline-variant/10 last:border-0"
                    >
                      <td className="px-5 py-3">
                        <span className="text-[13px] text-on-surface font-mono">
                          {m.metric}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-[13px] font-semibold text-on-surface">
                          {formatMetricValue(m.value)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-[12px] text-on-surface-variant">
                          {timeAgo(m.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Queues Section ─────────────────────────────

function QueuesSection() {
  const { data: queues, isLoading, refetch } = useQueueHealth();

  if (isLoading) {
    return <SectionLoader />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-on-surface">
          Queue Status
        </h3>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {!queues || queues.length === 0 ? (
        <Card className="!p-0">
          <div className="text-center py-12">
            <Server className="h-10 w-10 text-on-surface-variant/40 mx-auto mb-3" />
            <p className="text-[13px] text-on-surface-variant">
              No queue data available
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {queues.map((q) => (
            <QueueCard key={q.name} queue={q} />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueCard({ queue }: { queue: QueueHealth }) {
  const total = queue.active + queue.waiting + queue.completed + queue.failed;
  const failRate =
    total > 0 ? ((queue.failed / total) * 100).toFixed(1) : "0";

  return (
    <Card className="!p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-on-surface-variant" />
          <span className="text-[13px] font-medium text-on-surface font-mono">
            {queue.name}
          </span>
        </div>
        {queue.failed > 0 && (
          <Badge variant="error">{queue.failed} failed</Badge>
        )}
      </div>
      <div className="grid grid-cols-4 gap-3">
        <QueueStat label="Active" value={queue.active} color="text-primary" />
        <QueueStat
          label="Waiting"
          value={queue.waiting}
          color="text-warning"
        />
        <QueueStat
          label="Completed"
          value={queue.completed}
          color="text-on-surface-variant"
        />
        <QueueStat label="Failed" value={queue.failed} color="text-error" />
      </div>
      {total > 0 && (
        <div className="mt-3 pt-3 border-t border-outline-variant/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-on-surface-variant">
              Total processed: {total.toLocaleString()}
            </span>
            <span
              className={`text-[11px] font-medium ${Number(failRate) > 5 ? "text-error" : "text-on-surface-variant"}`}
            >
              Fail rate: {failRate}%
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

function QueueStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-base font-semibold ${color}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

// ─── Alerts Section ─────────────────────────────

function AlertsSection() {
  const { data: rules, isLoading: rulesLoading } = useAlertRules();
  const [historyPage, setHistoryPage] = useState(1);
  const { data: history, isLoading: historyLoading } = useAlertHistory({
    limit: PAGE_SIZE,
    offset: (historyPage - 1) * PAGE_SIZE,
  });

  if (rulesLoading) {
    return <SectionLoader />;
  }

  return (
    <div className="space-y-6">
      {/* Alert Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-5 w-5" />
            Alert Rules
            {rules && (
              <Badge variant="default" className="ml-2">
                {rules.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="!p-0">
          {!rules || rules.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-10 w-10 text-on-surface-variant/40 mx-auto mb-3" />
              <p className="text-[13px] text-on-surface-variant">
                No alert rules configured
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-container/40 border-b border-outline-variant/15">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      Name
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      Metric
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      Condition
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      Last Triggered
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr
                      key={rule.id}
                      className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container/15 transition-colors"
                    >
                      <td className="px-5 py-3 text-[13px] text-on-surface font-medium">
                        {rule.name}
                      </td>
                      <td className="px-5 py-3 text-[12px] text-on-surface-variant font-mono">
                        {rule.metric}
                      </td>
                      <td className="px-5 py-3 text-[12px] text-on-surface-variant">
                        {rule.condition} {rule.threshold} ({rule.windowSeconds}s
                        window)
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={rule.enabled ? "primary" : "default"}>
                          {rule.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-on-surface-variant">
                        {rule.lastTriggeredAt
                          ? timeAgo(rule.lastTriggeredAt)
                          : "Never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5" />
            Alert History
          </CardTitle>
        </CardHeader>
        <CardContent className="!p-0">
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" className="text-primary" />
            </div>
          ) : !history?.data?.length ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-10 w-10 text-on-surface-variant/40 mx-auto mb-3" />
              <p className="text-[13px] text-on-surface-variant">
                No alerts triggered yet
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface-container/40 border-b border-outline-variant/15">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        Time
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        Metric
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        Value / Threshold
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        Message
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.data.map((event) => (
                      <tr
                        key={event.id}
                        className="border-b border-outline-variant/10 last:border-0"
                      >
                        <td className="px-5 py-3 text-[12px] text-on-surface-variant font-mono whitespace-nowrap">
                          {formatTimestamp(event.createdAt)}
                        </td>
                        <td className="px-5 py-3 text-[12px] text-on-surface font-mono">
                          {event.metric}
                        </td>
                        <td className="px-5 py-3 text-[12px]">
                          <span className="text-error font-medium">
                            {formatMetricValue(event.value)}
                          </span>
                          <span className="text-on-surface-variant"> / </span>
                          <span className="text-on-surface-variant">
                            {formatMetricValue(event.threshold)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[12px] text-on-surface-variant max-w-[300px] truncate">
                          {event.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {history.total > PAGE_SIZE && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/15">
                  <span className="text-[12px] text-on-surface-variant">
                    Page {historyPage} of {Math.ceil(history.total / PAGE_SIZE)}
                    <span className="text-on-surface-variant/50 ml-1">
                      ({history.total} total)
                    </span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPage <= 1}
                      className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        setHistoryPage((p) =>
                          Math.min(Math.ceil(history.total / PAGE_SIZE), p + 1),
                        )
                      }
                      disabled={historyPage >= Math.ceil(history.total / PAGE_SIZE)}
                      className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Errors Section ─────────────────────────────

function ErrorsSection() {
  const { data: errors, isLoading } = useErrors({ windowMinutes: 60 });

  if (isLoading) {
    return <SectionLoader />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bug className="h-5 w-5" />
          Error Groups
        </CardTitle>
      </CardHeader>
      <CardContent className="!p-0">
        {!errors || errors.length === 0 ? (
          <div className="text-center py-12">
            <Bug className="h-10 w-10 text-on-surface-variant/40 mx-auto mb-3" />
            <p className="text-[13px] text-on-surface-variant">
              No errors tracked
            </p>
            <p className="text-[11px] text-on-surface-variant/60 mt-1">
              Errors will appear here when they occur
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-container/40 border-b border-outline-variant/15">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Error
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Count
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Context
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    First Seen
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Last Seen
                  </th>
                </tr>
              </thead>
              <tbody>
                {errors.map((err) => (
                  <tr
                    key={err.fingerprint}
                    className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container/15 transition-colors"
                  >
                    <td className="px-5 py-3 max-w-[300px]">
                      <p className="text-[13px] text-on-surface truncate">
                        {err.message}
                      </p>
                      <p className="text-[10px] text-on-surface-variant/50 font-mono mt-0.5 truncate">
                        {err.fingerprint}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`text-[14px] font-semibold ${err.count > 10 ? "text-error" : "text-on-surface"}`}
                      >
                        {err.count}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-on-surface-variant">
                      {err.context ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-on-surface-variant whitespace-nowrap">
                      {timeAgo(err.firstSeen)}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-on-surface-variant whitespace-nowrap">
                      {timeAgo(err.lastSeen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Shared Components ──────────────────────────

function HealthCheckCard({
  icon: Icon,
  label,
  status,
  detail,
}: {
  icon: typeof Database;
  label: string;
  status: HealthStatus;
  detail?: string;
}) {
  return (
    <Card className="!p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-on-surface-variant" />
        <span className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]}`}
        />
        <span
          className={`text-[14px] font-semibold capitalize ${STATUS_TEXT[status]}`}
        >
          {status}
        </span>
      </div>
      {detail && (
        <p className="text-[11px] text-on-surface-variant/60 mt-1">
          {detail}
        </p>
      )}
    </Card>
  );
}

function SectionLoader() {
  return (
    <Card>
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" className="text-primary" />
      </div>
    </Card>
  );
}

// ─── Helpers ────────────────────────────────────

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatMetricValue(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  if (value % 1 !== 0) return value.toFixed(2);
  return value.toString();
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
