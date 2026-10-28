"use client";

import { useId, useState } from "react";
import {
  Activity,
  Database,
  Radio,
  Wifi,
  AlertTriangle,
  Bell,
  Bug,
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Server,
  ServerCrash,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { KillSwitchesPanel } from "@/components/super-admin/kill-switches-panel";
import {
  useHealth,
  useQueueHealth,
  useLatestMetrics,
  useAlertRules,
  useAlertHistory,
  useErrors,
  useFailedJobs,
  useRetryJob,
  useCreateAlertRule,
  useUpdateAlertRule,
  useDeleteAlertRule,
} from "@/hooks/use-observability";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type {
  HealthStatus,
  QueueHealth,
  AlertRule,
  AlertCondition,
  CreateAlertRuleRequest,
  FailedJob,
  MetricSnapshot,
  AlertEvent,
  ErrorGroup,
} from "@/lib/types/observability";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PAGE_SIZE } from "@/lib/constants";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";

type ObsTab = "overview" | "queues" | "failed-jobs" | "alerts" | "errors" | "kill-switches";

const TABS: readonly ObsTab[] = ["overview", "queues", "failed-jobs", "alerts", "errors", "kill-switches"];

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

const metricColumns: DataTableColumn<MetricSnapshot>[] = [
  {
    id: "metric",
    header: "Metric",
    cell: (m) => <span className="text-body text-on-surface font-mono">{m.metric}</span>,
  },
  {
    id: "value",
    header: "Value",
    align: "right",
    cell: (m) => <span className="text-body font-semibold text-on-surface">{formatMetricValue(m.value)}</span>,
  },
  {
    id: "recordedAt",
    header: "Recorded at",
    align: "right",
    cell: (m) => <span className="text-label text-on-surface-variant">{timeAgo(m.createdAt)}</span>,
  },
];

const alertHistoryColumns: DataTableColumn<AlertEvent>[] = [
  {
    id: "time",
    header: "Time",
    cellClassName: "text-label text-on-surface-variant font-mono whitespace-nowrap",
    cell: (event) => formatTimestamp(event.createdAt),
  },
  { id: "metric", header: "Metric", cellClassName: "text-label text-on-surface font-mono", cell: (event) => event.metric },
  {
    id: "value",
    header: "Value / threshold",
    cellClassName: "text-label",
    cell: (event) => (
      <>
        <span className="text-error font-medium">{formatMetricValue(event.value)}</span>
        <span className="text-on-surface-variant"> / </span>
        <span className="text-on-surface-variant">{formatMetricValue(event.threshold)}</span>
      </>
    ),
  },
  {
    id: "message",
    header: "Message",
    cellClassName: "text-label text-on-surface-variant max-w-[300px] truncate",
    cell: (event) => event.message,
  },
];

const errorColumns: DataTableColumn<ErrorGroup>[] = [
  {
    id: "error",
    header: "Error",
    cellClassName: "max-w-[300px]",
    cell: (err) => (
      <>
        <p className="text-body text-on-surface truncate">{err.message}</p>
        <p className="text-caption text-on-surface-variant/50 font-mono mt-0.5 truncate">{err.fingerprint}</p>
      </>
    ),
  },
  {
    id: "count",
    header: "Count",
    align: "right",
    skeleton: "short",
    cell: (err) => (
      <span className={`text-body-lg font-semibold ${err.count > 10 ? "text-error" : "text-on-surface"}`}>{err.count}</span>
    ),
  },
  { id: "context", header: "Context", cellClassName: "text-label text-on-surface-variant", cell: (err) => err.context ?? "—" },
  {
    id: "firstSeen",
    header: "First seen",
    cellClassName: "text-label text-on-surface-variant whitespace-nowrap",
    cell: (err) => timeAgo(err.firstSeen),
  },
  {
    id: "lastSeen",
    header: "Last seen",
    cellClassName: "text-label text-on-surface-variant whitespace-nowrap",
    cell: (err) => timeAgo(err.lastSeen),
  },
];

// Platform-wide data: access is enforced by the super admin layout + API guard.
export default function SystemHealthPage() {
  // ?tab=kill-switches deep-links from the dashboard banner
  const requestedTab = useSearchParams().get("tab");
  const [activeTab, setActiveTab] = useState<ObsTab>(
    TABS.includes(requestedTab as ObsTab) ? (requestedTab as ObsTab) : "overview",
  );

  return (
    <div className="flex-1 p-4 lg:p-6 space-y-6">
      <PageHeader title="System health" />

      {/* Tabs */}
      <div role="tablist" aria-label="System health sections" className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-outline-variant p-0.5 w-fit">
        {(
          [
            { id: "overview", label: "Overview", icon: Activity },
            { id: "queues", label: "Queues", icon: Server },
            { id: "failed-jobs", label: "Failed jobs", icon: ServerCrash },
            { id: "alerts", label: "Alerts", icon: Bell },
            { id: "errors", label: "Errors", icon: Bug },
            { id: "kill-switches", label: "Kill switches", icon: Power },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-md text-body transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus",
              activeTab === tab.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            <tab.icon className="h-3.5 w-3.5" aria-hidden />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "overview" && <OverviewSection />}
      {activeTab === "queues" && <QueuesSection />}
      {activeTab === "failed-jobs" && <FailedJobsSection />}
      {activeTab === "alerts" && <AlertsSection />}
      {activeTab === "errors" && <ErrorsSection />}
      {activeTab === "kill-switches" && <KillSwitchesPanel />}
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
              <span className="text-label text-on-surface-variant">
                System status
              </span>
            </div>
            <p
              className={`text-title font-semibold capitalize ${STATUS_TEXT[health.status]}`}
            >
              {health.status}
            </p>
            <p className="text-caption text-on-surface-variant/60 mt-1">
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
            label="Queue system"
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
            <CardTitle className="flex items-center gap-2 text-title-sm">
              Latest metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="!p-0">
            <div className="overflow-x-auto">
              <DataTable
                label="Latest metrics"
                columns={metricColumns}
                rows={metrics}
                rowKey={(m) => `${m.metric}-${metrics.indexOf(m)}`}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Queues Section ─────────────────────────────

function QueuesSection() {
  const { data: queues, isLoading, isError, refetch } = useQueueHealth();

  if (isLoading) {
    return <SectionLoader />;
  }

  if (isError) {
    return <Alert variant="error">Could not load queue status. Use Refresh to try again.</Alert>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-body font-semibold text-on-surface">
          Queue status
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
            <p className="text-body text-on-surface-variant">
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
  // Over finished jobs only: waiting/active ones haven't succeeded or failed yet
  const finished = queue.completed + queue.failed;
  const failRate = finished > 0 ? (queue.failed / finished) * 100 : 0;
  const window = `${queue.windowHours}h`;

  return (
    <Card className="!p-5">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Server className="h-4 w-4 text-on-surface-variant shrink-0" aria-hidden />
          <span className="text-body font-medium text-on-surface font-mono truncate">
            {queue.name}
          </span>
        </div>
        {queue.status !== "healthy" ? (
          <Badge dot variant={queue.status === "critical" ? "error" : "warning"}>
            {queue.status === "critical" ? "Backlog critical" : "Backlog building"}
          </Badge>
        ) : queue.failed > 0 ? (
          <Badge dot variant="error">{queue.failed} failed</Badge>
        ) : null}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QueueStat label="Active" value={queue.active} color="text-primary" />
        <QueueStat label="Waiting" value={queue.waiting} color="text-warning" />
        <QueueStat label={`Done · ${window}`} value={queue.completed} color="text-on-surface-variant" />
        <QueueStat label={`Failed · ${window}`} value={queue.failed} color="text-error" />
      </div>
      {finished > 0 && (
        <div className="mt-3 pt-3 border-t border-outline-variant/10">
          <div className="flex items-center justify-between">
            <span className="text-caption text-on-surface-variant">
              Finished in last {window}: {finished.toLocaleString()}
            </span>
            <span
              className={`text-caption font-medium ${failRate > 5 ? "text-error" : "text-on-surface-variant"}`}
            >
              Fail rate: {failRate.toFixed(1)}%
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
      <p className="text-label text-on-surface-variant">
        {label}
      </p>
      <p className={`text-title-sm font-semibold ${color}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

// ─── Failed Jobs Section ────────────────────────

const RETRY_WARNING =
  "This re-runs the job with the same data as a new job. If the job partly succeeded before failing (e.g. a message was sent), that step may happen again.";

function FailedJobsSection() {
  const [page, setPage] = useState(1);
  const [queue, setQueue] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<FailedJob | null>(null);

  const { data: queues } = useQueueHealth();
  const { data, isLoading, isError, isFetching, refetch } = useFailedJobs({
    page,
    limit: PAGE_SIZE,
    queue: queue || undefined,
  });
  const retryJob = useRetryJob();

  const confirmRetry = () => {
    if (!retrying) return;
    retryJob.mutate(retrying.id, {
      onSuccess: () => {
        toast.success("Retried — new job queued");
        setRetrying(null);
      },
      onError: (err) => {
        toast.error(errorMessage(err, "Could not retry the job"));
        setRetrying(null);
      },
    });
  };

  const queueNames = (queues ?? []).map((q) => q.name).sort();

  const failedJobColumns: DataTableColumn<FailedJob>[] = [
    {
      id: "queue",
      header: "Queue",
      cellClassName: "text-label text-on-surface font-mono whitespace-nowrap",
      cell: (job) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="shrink-0 text-on-surface-variant/50" aria-hidden>
            {open === job.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
          {job.queue}
        </span>
      ),
    },
    {
      id: "state",
      header: "State",
      skeleton: "badge",
      cell: (job) => (
        <Badge dot variant={job.state === "failed" ? "error" : "warning"}>
          {job.state === "failed" ? "Failed" : "Expired"}
        </Badge>
      ),
    },
    {
      id: "attempts",
      header: "Attempts",
      skeleton: "short",
      cellClassName: "text-label text-on-surface-variant tabular-nums",
      cell: (job) => job.attempts,
    },
    {
      id: "failedAt",
      header: "Failed at",
      cellClassName: "text-label text-on-surface-variant whitespace-nowrap",
      cell: (job) => (
        <time dateTime={job.failedAt} title={new Date(job.failedAt).toLocaleString()}>
          {timeAgo(job.failedAt)}
        </time>
      ),
    },
    {
      id: "error",
      header: "Error",
      cellClassName: "text-label text-on-surface-variant max-w-[320px]",
      cell: (job) => (
        <p className="truncate" title={job.error ?? undefined}>
          {job.error ?? "—"}
        </p>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      hideHeader: true,
      align: "right",
      skeleton: "none",
      cell: (job) =>
        job.retried ? (
          <Badge dot variant="muted">Retried</Badge>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setRetrying(job);
            }}
            aria-label={`Retry job ${job.id}`}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Retry
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterBar>
          <FilterSelect
            id="failed-jobs-queue"
            label="Filter by queue"
            active={!!queue}
            value={queue}
            onChange={(e) => {
              setQueue(e.target.value);
              setPage(1);
              setOpen(null);
            }}
          >
            <option value="">All queues</option>
            {queueNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </FilterSelect>
        </FilterBar>
        <div className="flex items-center gap-3">
          {isFetching && !isLoading && (
            <span role="status" className="text-label text-on-surface-variant">
              Updating…
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="!p-0">
        <DataTable
          label="Failed and expired jobs, newest first"
          columns={failedJobColumns}
          rows={data?.jobs ?? []}
          rowKey={(job) => job.id}
          rowActionLabel={(job) => `${open === job.id ? "Hide" : "Show"} details for job ${job.id}`}
          loading={isLoading}
          error={isError}
          onRetry={() => refetch()}
          empty={{ icon: <ServerCrash className="h-12 w-12" />, title: "No failed jobs", compact: true }}
          onRowClick={(job) => setOpen(open === job.id ? null : job.id)}
          renderExpandedRow={(job) => (
            <div className="space-y-3">
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-label">
                <div>
                  <dt className="text-on-surface-variant">Job ID</dt>
                  <dd className="text-on-surface font-mono break-all">{job.id}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Created</dt>
                  <dd className="text-on-surface">{new Date(job.createdAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Failed</dt>
                  <dd className="text-on-surface">{new Date(job.failedAt).toLocaleString()}</dd>
                </div>
              </dl>
              {job.error && (
                <div>
                  <p className="text-label text-on-surface-variant mb-1">Error</p>
                  <pre className="text-caption font-mono text-error whitespace-pre-wrap break-words bg-surface-container/40 rounded-lg p-3 max-h-48 overflow-auto">
                    {job.error}
                  </pre>
                </div>
              )}
              <div>
                <p className="text-label text-on-surface-variant mb-1">
                  Data <span className="text-on-surface-variant/60">(secrets redacted)</span>
                </p>
                <pre className="text-caption font-mono text-on-surface whitespace-pre-wrap break-words bg-surface-container/40 rounded-lg p-3 max-h-80 overflow-auto">
                  {formatJson(job.data)}
                </pre>
              </div>
            </div>
          )}
          isRowExpanded={(job) => open === job.id}
          pagination={data ? { page: page - 1, pageSize: PAGE_SIZE, total: data.total, onPageChange: (p) => setPage(p + 1) } : undefined}
        />
      </Card>

      <ConfirmDialog
        open={!!retrying}
        title="Retry this job?"
        message={RETRY_WARNING}
        confirmLabel="Retry job"
        variant="warning"
        loading={retryJob.isPending}
        onConfirm={confirmRetry}
        onCancel={() => setRetrying(null)}
      />
    </div>
  );
}

// ─── Alert Rule Form ────────────────────────────

const CONDITIONS: { value: AlertCondition; label: string }[] = [
  { value: "gt", label: "Greater than (>)" },
  { value: "gte", label: "Greater than or equal (≥)" },
  { value: "lt", label: "Less than (<)" },
  { value: "lte", label: "Less than or equal (≤)" },
  { value: "eq", label: "Equal to (=)" },
];

const CONDITION_SYMBOL: Record<AlertCondition, string> = {
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  eq: "=",
};

/** Channels the alert dispatcher understands (observability-events.handler.ts) */
const KNOWN_CHANNELS = [
  { value: "webhook", label: "Webhook" },
  { value: "slack", label: "Slack" },
  { value: "email", label: "Email" },
];

interface RuleForm {
  name: string;
  metric: string;
  condition: AlertCondition;
  threshold: string;
  windowSeconds: string;
  cooldownSeconds: string;
  channels: string[];
  channelConfig: string;
  enabled: boolean;
}

const EMPTY_RULE_FORM: RuleForm = {
  name: "",
  metric: "",
  condition: "gt",
  threshold: "",
  windowSeconds: "300",
  cooldownSeconds: "900",
  channels: [],
  channelConfig: "{}",
  enabled: true,
};

function ruleToForm(rule: AlertRule): RuleForm {
  return {
    name: rule.name,
    metric: rule.metric,
    condition: rule.condition,
    threshold: String(rule.threshold),
    windowSeconds: String(rule.windowSeconds),
    cooldownSeconds: String(rule.cooldownSeconds),
    channels: rule.channels ?? [],
    channelConfig: JSON.stringify(rule.channelConfig ?? {}, null, 2),
    enabled: rule.enabled,
  };
}

/** Validates the form; returns the request body or an error message. */
function parseRuleForm(form: RuleForm): { data: CreateAlertRuleRequest } | { error: string } {
  const threshold = Number(form.threshold);
  if (form.threshold.trim() === "" || !Number.isFinite(threshold)) {
    return { error: "Threshold must be a number." };
  }
  const windowSeconds = Number(form.windowSeconds);
  if (!Number.isInteger(windowSeconds) || windowSeconds < 10 || windowSeconds > 86400) {
    return { error: "Window must be a whole number of seconds between 10 and 86400." };
  }
  const cooldownSeconds = Number(form.cooldownSeconds);
  if (!Number.isInteger(cooldownSeconds) || cooldownSeconds < 60 || cooldownSeconds > 86400) {
    return { error: "Cooldown must be a whole number of seconds between 60 and 86400." };
  }
  let channelConfig: unknown;
  try {
    channelConfig = JSON.parse(form.channelConfig.trim() || "{}");
  } catch {
    return { error: "Channel config isn't valid JSON." };
  }
  if (typeof channelConfig !== "object" || channelConfig === null || Array.isArray(channelConfig)) {
    return { error: "Channel config must be a JSON object, e.g. {\"webhook\": \"https://…\"}." };
  }
  return {
    data: {
      name: form.name.trim(),
      metric: form.metric.trim(),
      condition: form.condition,
      threshold,
      windowSeconds,
      cooldownSeconds,
      channels: form.channels,
      channelConfig: channelConfig as Record<string, unknown>,
      enabled: form.enabled,
    },
  };
}

function AlertRuleFormBody({
  initial,
  isEdit,
  titleId,
  error,
  loading,
  onClose,
  onSave,
}: {
  initial: RuleForm;
  isEdit: boolean;
  titleId: string;
  error: string | null;
  loading: boolean;
  onClose: () => void;
  onSave: (form: RuleForm) => void;
}) {
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;
  const [form, setForm] = useState<RuleForm>(initial);
  const set = <K extends keyof RuleForm>(field: K, value: RuleForm[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  // Keep any channel the rule already has, even if this UI doesn't know it
  const channelOptions = [
    ...KNOWN_CHANNELS,
    ...initial.channels
      .filter((c) => !KNOWN_CHANNELS.some((k) => k.value === c))
      .map((c) => ({ value: c, label: c })),
  ];

  const toggleChannel = (value: string, checked: boolean) =>
    set(
      "channels",
      checked ? [...form.channels, value] : form.channels.filter((c) => c !== value),
    );

  return (
    <form
      className="p-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 id={titleId} className="text-title font-semibold text-on-surface">
          {isEdit ? "Edit alert rule" : "New alert rule"}
        </h2>
        <IconButton type="button" size="sm" aria-label="Close dialog" onClick={onClose}>
          <X className="w-5 h-5" aria-hidden />
        </IconButton>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={fid("name")} className={labelClass}>
            Name
          </label>
          <input
            id={fid("name")}
            autoFocus
            required
            maxLength={255}
            className={inputClass}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="High error rate"
          />
        </div>
        <div>
          <label htmlFor={fid("metric")} className={labelClass}>
            Metric
          </label>
          <input
            id={fid("metric")}
            required
            maxLength={100}
            className={`${inputClass} font-mono`}
            value={form.metric}
            onChange={(e) => set("metric", e.target.value)}
            placeholder="error_rate"
          />
        </div>
        <div>
          <label htmlFor={fid("condition")} className={labelClass}>
            Condition
          </label>
          <select
            id={fid("condition")}
            className={inputClass}
            value={form.condition}
            onChange={(e) => set("condition", e.target.value as AlertCondition)}
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={fid("threshold")} className={labelClass}>
            Threshold
          </label>
          <input
            id={fid("threshold")}
            type="number"
            step="any"
            required
            className={inputClass}
            value={form.threshold}
            onChange={(e) => set("threshold", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={fid("window")} className={labelClass}>
            Window (seconds)
          </label>
          <input
            id={fid("window")}
            type="number"
            min={10}
            max={86400}
            step={1}
            className={inputClass}
            value={form.windowSeconds}
            onChange={(e) => set("windowSeconds", e.target.value)}
            aria-describedby={fid("window-hint")}
          />
          <p id={fid("window-hint")} className="text-label text-on-surface-variant mt-0.5">
            10 – 86400
          </p>
        </div>
        <div>
          <label htmlFor={fid("cooldown")} className={labelClass}>
            Cooldown (seconds)
          </label>
          <input
            id={fid("cooldown")}
            type="number"
            min={60}
            max={86400}
            step={1}
            className={inputClass}
            value={form.cooldownSeconds}
            onChange={(e) => set("cooldownSeconds", e.target.value)}
            aria-describedby={fid("cooldown-hint")}
          />
          <p id={fid("cooldown-hint")} className="text-label text-on-surface-variant mt-0.5">
            Minimum time between alerts · 60 – 86400
          </p>
        </div>

        <fieldset className="sm:col-span-2">
          <legend className={labelClass}>Channels</legend>
          <div className="flex flex-wrap gap-4">
            {channelOptions.map((c) => (
              <label
                key={c.value}
                className="flex items-center gap-2 text-body-lg text-on-surface-variant cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={form.channels.includes(c.value)}
                  onChange={(e) => toggleChannel(c.value, e.target.checked)}
                  className="h-4 w-4 rounded border-outline accent-primary"
                />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="sm:col-span-2">
          <label htmlFor={fid("config")} className={labelClass}>
            Channel config (JSON)
          </label>
          <textarea
            id={fid("config")}
            rows={5}
            spellCheck={false}
            className={`${inputClass} font-mono text-body resize-y`}
            value={form.channelConfig}
            onChange={(e) => set("channelConfig", e.target.value)}
            placeholder={'{\n  "webhook": "https://example.com/hook",\n  "slack": "https://hooks.slack.com/…",\n  "email": "ops@example.com"\n}'}
            aria-describedby={fid("config-hint")}
          />
          <p id={fid("config-hint")} className="text-label text-on-surface-variant mt-0.5">
            One key per channel: <span className="font-mono">webhook</span>,{" "}
            <span className="font-mono">slack</span> (webhook URLs) or{" "}
            <span className="font-mono">email</span>.
          </p>
        </div>

        <label className="sm:col-span-2 flex items-center gap-2 text-body-lg text-on-surface-variant cursor-pointer">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
            className="h-4 w-4 rounded border-outline accent-primary"
          />
          Enabled
        </label>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {!loading && <Check className="w-4 h-4" aria-hidden />}
          {isEdit ? "Save rule" : "Create rule"}
        </Button>
      </div>
    </form>
  );
}

// ─── Alerts Section ─────────────────────────────

function AlertsSection() {
  const {
    data: rules,
    isLoading: rulesLoading,
    isError: rulesError,
    refetch: refetchRules,
  } = useAlertRules();
  const [historyPage, setHistoryPage] = useState(1);
  const { data: history, isLoading: historyLoading } = useAlertHistory({
    limit: PAGE_SIZE,
    offset: (historyPage - 1) * PAGE_SIZE,
  });

  const createRule = useCreateAlertRule();
  const updateRule = useUpdateAlertRule();
  const deleteRule = useDeleteAlertRule();
  const titleId = useId();

  const [modal, setModal] = useState<{ open: boolean; editing: AlertRule | null }>({
    open: false,
    editing: null,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AlertRule | null>(null);
  /** Rule whose enabled toggle is in flight */
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const openCreate = () => {
    setFormError(null);
    setModal({ open: true, editing: null });
  };
  const openEdit = (rule: AlertRule) => {
    setFormError(null);
    setModal({ open: true, editing: rule });
  };
  const closeModal = () => setModal({ open: false, editing: null });
  const isSaving = createRule.isPending || (updateRule.isPending && !togglingId);

  const handleSave = (form: RuleForm) => {
    const parsed = parseRuleForm(form);
    if ("error" in parsed) {
      setFormError(parsed.error);
      return;
    }
    if (!parsed.data.name || !parsed.data.metric) {
      setFormError("Name and metric are required.");
      return;
    }
    setFormError(null);
    const editing = modal.editing;
    const callbacks = {
      onSuccess: () => {
        toast.success(`Alert rule "${parsed.data.name}" saved`);
        closeModal();
      },
      onError: (err: unknown) => setFormError(errorMessage(err, "Could not save the alert rule")),
    };
    if (editing) {
      updateRule.mutate({ id: editing.id, data: parsed.data }, callbacks);
    } else {
      createRule.mutate(parsed.data, callbacks);
    }
  };

  const handleToggle = (rule: AlertRule) => {
    setTogglingId(rule.id);
    updateRule.mutate(
      { id: rule.id, data: { enabled: !rule.enabled } },
      {
        onSuccess: () =>
          toast.success(`"${rule.name}" ${rule.enabled ? "disabled" : "enabled"}`),
        onError: (err) => toast.error(errorMessage(err, "Could not update the alert rule")),
        onSettled: () => setTogglingId(null),
      },
    );
  };

  const confirmDelete = () => {
    if (!deleting) return;
    const rule = deleting;
    deleteRule.mutate(rule.id, {
      onSuccess: () => {
        toast.success(`"${rule.name}" deleted`);
        setDeleting(null);
      },
      onError: (err) => {
        toast.error(errorMessage(err, "Could not delete the alert rule"));
        setDeleting(null);
      },
    });
  };

  if (rulesLoading) {
    return <SectionLoader />;
  }

  const ruleColumns: DataTableColumn<AlertRule>[] = [
    { id: "name", header: "Name", cellClassName: "text-body text-on-surface font-medium", cell: (rule) => rule.name },
    { id: "metric", header: "Metric", cellClassName: "text-label text-on-surface-variant font-mono", cell: (rule) => rule.metric },
    {
      id: "condition",
      header: "Condition",
      cellClassName: "text-label text-on-surface-variant",
      cell: (rule) => (
        <>
          {CONDITION_SYMBOL[rule.condition] ?? rule.condition} {rule.threshold} (
          {rule.windowSeconds}s window)
        </>
      ),
    },
    {
      id: "status",
      header: "Status",
      skeleton: "badge",
      cell: (rule) => (
        <Badge dot variant={rule.enabled ? "success" : "muted"}>
          {rule.enabled ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      id: "lastTriggered",
      header: "Last triggered",
      cellClassName: "text-label text-on-surface-variant",
      cell: (rule) => (rule.lastTriggeredAt ? timeAgo(rule.lastTriggeredAt) : "Never"),
    },
    {
      id: "actions",
      header: "Actions",
      hideHeader: true,
      align: "right",
      skeleton: "none",
      cell: (rule) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            size="sm"
            role="switch"
            aria-checked={rule.enabled}
            aria-label={`${rule.name} enabled`}
            disabled={togglingId === rule.id}
            onClick={() => handleToggle(rule)}
          >
            {rule.enabled ? (
              <ToggleRight className="h-4 w-4 text-success" aria-hidden />
            ) : (
              <ToggleLeft className="h-4 w-4" aria-hidden />
            )}
          </IconButton>
          <IconButton size="sm" onClick={() => openEdit(rule)} aria-label={`Edit ${rule.name}`}>
            <Pencil className="h-4 w-4" aria-hidden />
          </IconButton>
          <IconButton
            size="sm"
            onClick={() => setDeleting(rule)}
            className="hover:text-error hover:bg-error/10"
            aria-label={`Delete ${rule.name}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Alert Rules */}
      <Card>
        <CardHeader className="flex items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-baseline gap-2 text-title-sm">
            Alert rules
            {rules && (
              <span className="text-body font-normal tabular-nums text-on-surface-variant">{rules.length}</span>
            )}
          </CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            New rule
          </Button>
        </CardHeader>
        <CardContent className="!p-0">
          <DataTable
            label="Alert rules"
            columns={ruleColumns}
            rows={rules ?? []}
            rowKey={(rule) => rule.id}
            rowLabel={(rule) => rule.name}
            error={rulesError}
            onRetry={() => refetchRules()}
            empty={{
              icon: <Bell className="h-10 w-10" />,
              title: "No alert rules configured",
              compact: true,
            }}
          />
        </CardContent>
      </Card>

      <Modal
        open={modal.open}
        onClose={closeModal}
        dismissible={!isSaving}
        aria-labelledby={titleId}
        className="max-w-2xl"
      >
        {() => (
          <AlertRuleFormBody
            key={modal.editing?.id ?? "new"}
            initial={modal.editing ? ruleToForm(modal.editing) : EMPTY_RULE_FORM}
            isEdit={!!modal.editing}
            titleId={titleId}
            error={formError}
            loading={isSaving}
            onClose={closeModal}
            onSave={handleSave}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title={`Delete "${deleting?.name ?? ""}"?`}
        message="This permanently removes the rule. Rules that have fired before can't be deleted — disable them instead."
        confirmLabel="Delete rule"
        variant="danger"
        loading={deleteRule.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />

      {/* Alert History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-title-sm">
            Alert history
          </CardTitle>
        </CardHeader>
        <CardContent className="!p-0">
          <DataTable
            label="Alert history"
            columns={alertHistoryColumns}
            rows={history?.data ?? []}
            rowKey={(event) => event.id}
            loading={historyLoading}
            skeletonRows={5}
            empty={{
              icon: <AlertTriangle className="h-10 w-10" />,
              title: "No alerts triggered yet",
              compact: true,
            }}
            pagination={
              history
                ? { page: historyPage - 1, pageSize: PAGE_SIZE, total: history.total, onPageChange: (p) => setHistoryPage(p + 1) }
                : undefined
            }
          />
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
        <CardTitle className="flex items-center gap-2 text-title-sm">
          Error groups
        </CardTitle>
      </CardHeader>
      <CardContent className="!p-0">
        <DataTable
          label="Error groups"
          columns={errorColumns}
          rows={errors ?? []}
          rowKey={(err) => err.fingerprint}
          empty={{
            icon: <Bug className="h-10 w-10" />,
            title: "No errors tracked",
            description: "Errors will appear here when they occur",
          }}
        />
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
        <span className="text-label text-on-surface-variant">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]}`}
        />
        <span
          className={`text-body-lg font-semibold capitalize ${STATUS_TEXT[status]}`}
        >
          {status}
        </span>
      </div>
      {detail && (
        <p className="text-caption text-on-surface-variant/60 mt-1">
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

const inputClass =
  "w-full px-3 py-2 text-body-lg rounded-lg border border-outline-variant bg-surface-container-low text-on-surface placeholder:text-placeholder outline-none hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed";
const labelClass = "block text-label font-medium text-on-surface-variant mb-1";

/** Server message from an API error (Nest sends a string or an array of strings). */
function errorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data
    ?.message;
  if (Array.isArray(message)) return message.join(", ");
  return typeof message === "string" && message ? message : fallback;
}

function formatJson(value: unknown): string {
  if (value === undefined || value === null) return "null";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

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
