"use client";

import { Fragment, useId, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Gauge,
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
} from "@/lib/types/observability";
import { PAGE_SIZE } from "@/lib/constants";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

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

// Platform-wide data: access is enforced by the super admin layout + API guard.
export default function SystemHealthPage() {
  // ?tab=kill-switches deep-links from the dashboard banner
  const requestedTab = useSearchParams().get("tab");
  const [activeTab, setActiveTab] = useState<ObsTab>(
    TABS.includes(requestedTab as ObsTab) ? (requestedTab as ObsTab) : "overview",
  );

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-title font-semibold text-on-surface">System Health</h1>
        <p className="text-body-lg text-on-surface-variant mt-1">
          Platform-wide health, queues, alerts, errors and kill switches across all organizations
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container/30 p-1 rounded-lg w-fit">
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
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-body font-medium transition-colors ${
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
              <Gauge className="h-5 w-5" />
              Latest Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-container/40 border-b border-outline-variant/15">
                    <th className="px-5 py-3 text-left text-label text-on-surface-variant">
                      Metric
                    </th>
                    <th className="px-5 py-3 text-right text-label text-on-surface-variant">
                      Value
                    </th>
                    <th className="px-5 py-3 text-right text-label text-on-surface-variant">
                      Recorded at
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
                        <span className="text-body text-on-surface font-mono">
                          {m.metric}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-body font-semibold text-on-surface">
                          {formatMetricValue(m.value)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-label text-on-surface-variant">
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
          <Badge variant={queue.status === "critical" ? "error" : "warning"}>
            {queue.status === "critical" ? "Backlog critical" : "Backlog building"}
          </Badge>
        ) : queue.failed > 0 ? (
          <Badge variant="error">{queue.failed} failed</Badge>
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label htmlFor="failed-jobs-queue" className={labelClass}>
            Queue
          </label>
          <select
            id="failed-jobs-queue"
            value={queue}
            onChange={(e) => {
              setQueue(e.target.value);
              setPage(1);
              setOpen(null);
            }}
            className={inputClass}
          >
            <option value="">All queues</option>
            {queueNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">Failed and expired jobs, newest first</caption>
            <thead>
              <tr className="bg-surface-container/40 border-b border-outline-variant/15">
                <th scope="col" className="w-10">
                  <span className="sr-only">Details</span>
                </th>
                {["Queue", "State", "Attempts", "Failed at", "Error"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-5 py-3 text-left text-label text-on-surface-variant"
                  >
                    {h}
                  </th>
                ))}
                <th scope="col" className="px-5 py-3 text-right text-label text-on-surface-variant">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center" role="status">
                    <Spinner size="lg" className="mx-auto text-primary" />
                    <span className="sr-only">Loading failed jobs…</span>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-body text-error" role="alert">
                    Could not load failed jobs.{" "}
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="underline hover:no-underline"
                    >
                      Try again
                    </button>
                  </td>
                </tr>
              ) : !data?.jobs.length ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <ServerCrash
                      className="h-10 w-10 text-on-surface-variant/40 mx-auto mb-3"
                      aria-hidden
                    />
                    <p className="text-body text-on-surface-variant">No failed jobs</p>
                  </td>
                </tr>
              ) : (
                data.jobs.map((job) => {
                  const expanded = open === job.id;
                  return (
                    <Fragment key={job.id}>
                      <tr className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container/15 transition-colors">
                        <td className="pl-2">
                          <IconButton
                            size="sm"
                            aria-expanded={expanded}
                            aria-controls={`job-details-${job.id}`}
                            aria-label={`${expanded ? "Hide" : "Show"} job details`}
                            onClick={() => setOpen(expanded ? null : job.id)}
                          >
                            <ChevronDown
                              className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
                              aria-hidden
                            />
                          </IconButton>
                        </td>
                        <td className="px-5 py-3 text-label text-on-surface font-mono whitespace-nowrap">
                          {job.queue}
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={job.state === "failed" ? "error" : "warning"}>
                            {job.state === "failed" ? "Failed" : "Expired"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-label text-on-surface-variant tabular-nums">
                          {job.attempts}
                        </td>
                        <td className="px-5 py-3 text-label text-on-surface-variant whitespace-nowrap">
                          <time dateTime={job.failedAt} title={new Date(job.failedAt).toLocaleString()}>
                            {timeAgo(job.failedAt)}
                          </time>
                        </td>
                        <td className="px-5 py-3 text-label text-on-surface-variant max-w-[320px]">
                          <p className="truncate" title={job.error ?? undefined}>
                            {job.error ?? "—"}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {job.retried ? (
                            <Badge variant="muted">Retried</Badge>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRetrying(job)}
                              aria-label={`Retry job ${job.id}`}
                            >
                              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                              Retry
                            </Button>
                          )}
                        </td>
                      </tr>
                      {expanded && (
                        <tr id={`job-details-${job.id}`} className="border-b border-outline-variant/10">
                          <td />
                          <td colSpan={6} className="px-5 pb-4 pt-1 space-y-3">
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
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/15">
            <span className="text-label text-on-surface-variant">{data.total} total</span>
            <div className="flex items-center gap-2">
              <IconButton
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </IconButton>
              <span className="text-label text-on-surface-variant">
                {page} / {data.totalPages}
              </span>
              <IconButton
                size="sm"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </IconButton>
            </div>
          </div>
        )}
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

  return (
    <div className="space-y-6">
      {/* Alert Rules */}
      <Card>
        <CardHeader className="flex items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-title-sm">
            <Bell className="h-5 w-5" />
            Alert Rules
            {rules && (
              <Badge variant="default" className="ml-2">
                {rules.length}
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            New rule
          </Button>
        </CardHeader>
        <CardContent className="!p-0">
          {rulesError ? (
            <div className="py-12 text-center text-body text-error" role="alert">
              Could not load alert rules.{" "}
              <button
                type="button"
                onClick={() => refetchRules()}
                className="underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          ) : !rules || rules.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-10 w-10 text-on-surface-variant/40 mx-auto mb-3" />
              <p className="text-body text-on-surface-variant">
                No alert rules configured
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-container/40 border-b border-outline-variant/15">
                    <th className="px-5 py-3 text-left text-label text-on-surface-variant">
                      Name
                    </th>
                    <th className="px-5 py-3 text-left text-label text-on-surface-variant">
                      Metric
                    </th>
                    <th className="px-5 py-3 text-left text-label text-on-surface-variant">
                      Condition
                    </th>
                    <th className="px-5 py-3 text-left text-label text-on-surface-variant">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-label text-on-surface-variant">
                      Last triggered
                    </th>
                    <th className="px-5 py-3 text-right text-label text-on-surface-variant">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr
                      key={rule.id}
                      className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container/15 transition-colors"
                    >
                      <td className="px-5 py-3 text-body text-on-surface font-medium">
                        {rule.name}
                      </td>
                      <td className="px-5 py-3 text-label text-on-surface-variant font-mono">
                        {rule.metric}
                      </td>
                      <td className="px-5 py-3 text-label text-on-surface-variant">
                        {CONDITION_SYMBOL[rule.condition] ?? rule.condition} {rule.threshold} (
                        {rule.windowSeconds}s window)
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={rule.enabled ? "primary" : "default"}>
                          {rule.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-label text-on-surface-variant">
                        {rule.lastTriggeredAt
                          ? timeAgo(rule.lastTriggeredAt)
                          : "Never"}
                      </td>
                      <td className="px-5 py-3">
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
                          <IconButton
                            size="sm"
                            onClick={() => openEdit(rule)}
                            aria-label={`Edit ${rule.name}`}
                          >
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
              <p className="text-body text-on-surface-variant">
                No alerts triggered yet
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface-container/40 border-b border-outline-variant/15">
                      <th className="px-5 py-3 text-left text-label text-on-surface-variant">
                        Time
                      </th>
                      <th className="px-5 py-3 text-left text-label text-on-surface-variant">
                        Metric
                      </th>
                      <th className="px-5 py-3 text-left text-label text-on-surface-variant">
                        Value / threshold
                      </th>
                      <th className="px-5 py-3 text-left text-label text-on-surface-variant">
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
                        <td className="px-5 py-3 text-label text-on-surface-variant font-mono whitespace-nowrap">
                          {formatTimestamp(event.createdAt)}
                        </td>
                        <td className="px-5 py-3 text-label text-on-surface font-mono">
                          {event.metric}
                        </td>
                        <td className="px-5 py-3 text-label">
                          <span className="text-error font-medium">
                            {formatMetricValue(event.value)}
                          </span>
                          <span className="text-on-surface-variant"> / </span>
                          <span className="text-on-surface-variant">
                            {formatMetricValue(event.threshold)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-label text-on-surface-variant max-w-[300px] truncate">
                          {event.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {history.total > PAGE_SIZE && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/15">
                  <span className="text-label text-on-surface-variant">
                    Page {historyPage} of {Math.ceil(history.total / PAGE_SIZE)}
                    <span className="text-on-surface-variant/50 ml-1">
                      ({history.total} total)
                    </span>
                  </span>
                  <div className="flex items-center gap-1">
                    <IconButton size="sm"
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPage <= 1} aria-label="Previous page">
                      <ChevronLeft className="h-4 w-4" />
                    </IconButton>
                    <IconButton size="sm"
                      onClick={() =>
                        setHistoryPage((p) =>
                          Math.min(Math.ceil(history.total / PAGE_SIZE), p + 1),
                        )
                      }
                      disabled={historyPage >= Math.ceil(history.total / PAGE_SIZE)} aria-label="Next page">
                      <ChevronRight className="h-4 w-4" />
                    </IconButton>
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
        <CardTitle className="flex items-center gap-2 text-title-sm">
          <Bug className="h-5 w-5" />
          Error Groups
        </CardTitle>
      </CardHeader>
      <CardContent className="!p-0">
        {!errors || errors.length === 0 ? (
          <div className="text-center py-12">
            <Bug className="h-10 w-10 text-on-surface-variant/40 mx-auto mb-3" />
            <p className="text-body text-on-surface-variant">
              No errors tracked
            </p>
            <p className="text-caption text-on-surface-variant/60 mt-1">
              Errors will appear here when they occur
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-container/40 border-b border-outline-variant/15">
                  <th className="px-5 py-3 text-left text-label text-on-surface-variant">
                    Error
                  </th>
                  <th className="px-5 py-3 text-right text-label text-on-surface-variant">
                    Count
                  </th>
                  <th className="px-5 py-3 text-left text-label text-on-surface-variant">
                    Context
                  </th>
                  <th className="px-5 py-3 text-left text-label text-on-surface-variant">
                    First seen
                  </th>
                  <th className="px-5 py-3 text-left text-label text-on-surface-variant">
                    Last seen
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
                      <p className="text-body text-on-surface truncate">
                        {err.message}
                      </p>
                      <p className="text-caption text-on-surface-variant/50 font-mono mt-0.5 truncate">
                        {err.fingerprint}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`text-body-lg font-semibold ${err.count > 10 ? "text-error" : "text-on-surface"}`}
                      >
                        {err.count}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-label text-on-surface-variant">
                      {err.context ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-label text-on-surface-variant whitespace-nowrap">
                      {timeAgo(err.firstSeen)}
                    </td>
                    <td className="px-5 py-3 text-label text-on-surface-variant whitespace-nowrap">
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
