import superAdminClient from "./super-admin-client";
import type {
  HealthCheck,
  QueueHealth,
  AggregatedMetric,
  TimeSeriesPoint,
  MetricSnapshot,
  QueryMetricsParams,
  QueryTimeSeriesParams,
  AlertRule,
  AlertListResponse,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  QueryAlertsParams,
  ErrorGroup,
  QueryErrorsParams,
  FailedJobsResponse,
  QueryFailedJobsParams,
  RetryJobResponse,
} from "@/lib/types/observability";

// Platform-wide health data — served only to super admins (/super-admin/system).
// superAdminClient does not unwrap the { success, data } envelope, hence r.data.data.
const BASE = "/super-admin/system";

export const observabilityApi = {
  // ─── Health ───

  getHealth: () =>
    superAdminClient.get<{ data: HealthCheck }>(`${BASE}/health`).then((r) => r.data.data),

  getQueueHealth: async (): Promise<QueueHealth[]> => {
    const r = await superAdminClient.get<{
      data: Record<string, Omit<QueueHealth, "name"> & { depth: number }>;
    }>(`${BASE}/health/queues`);
    return Object.entries(r.data.data).map(([name, q]) => ({
      name,
      active: q.active,
      waiting: q.waiting,
      completed: q.completed,
      failed: q.failed,
      windowHours: q.windowHours,
      status: q.status,
    }));
  },

  // ─── Metrics ───

  getMetrics: (params?: QueryMetricsParams) =>
    superAdminClient
      .get<{ data: AggregatedMetric[] }>(`${BASE}/metrics`, { params })
      .then((r) => r.data.data),

  getTimeSeries: (params: QueryTimeSeriesParams) =>
    superAdminClient
      .get<{ data: TimeSeriesPoint[] }>(`${BASE}/metrics/timeseries`, { params })
      .then((r) => r.data.data),

  getLatestMetrics: () =>
    superAdminClient
      .get<{ data: MetricSnapshot[] }>(`${BASE}/metrics/latest`)
      .then((r) => r.data.data),

  // ─── Alerts ───

  listAlertRules: () =>
    superAdminClient.get<{ data: AlertRule[] }>(`${BASE}/alerts/rules`).then((r) => r.data.data),

  createAlertRule: (data: CreateAlertRuleRequest) =>
    superAdminClient
      .post<{ data: AlertRule }>(`${BASE}/alerts/rules`, data)
      .then((r) => r.data.data),

  updateAlertRule: (id: string, data: UpdateAlertRuleRequest) =>
    superAdminClient
      .patch<{ data: AlertRule }>(`${BASE}/alerts/rules/${id}`, data)
      .then((r) => r.data.data),

  /** 400 if the rule has alert history (disable it instead) */
  deleteAlertRule: (id: string) =>
    superAdminClient
      .delete<{ data: { deleted: true } }>(`${BASE}/alerts/rules/${id}`)
      .then((r) => r.data.data),

  getAlertHistory: (params?: QueryAlertsParams) =>
    superAdminClient
      .get<{ data: AlertListResponse }>(`${BASE}/alerts/history`, { params })
      .then((r) => r.data.data),

  // ─── Failed jobs ───

  getFailedJobs: (params?: QueryFailedJobsParams) =>
    superAdminClient
      .get<{ data: FailedJobsResponse }>(`${BASE}/jobs/failed`, { params })
      .then((r) => r.data.data),

  /** Re-queues the job's data as a new job. 400 if already retried / not retryable, 404 if gone. */
  retryJob: (id: string) =>
    superAdminClient
      .post<{ data: RetryJobResponse }>(`${BASE}/jobs/${id}/retry`)
      .then((r) => r.data.data),

  // ─── Errors ───

  getErrors: (params?: QueryErrorsParams) =>
    superAdminClient
      .get<{ data: ErrorGroup[] }>(`${BASE}/errors`, { params })
      .then((r) => r.data.data),
};
