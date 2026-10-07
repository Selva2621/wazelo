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
  QueryAlertsParams,
  ErrorGroup,
  QueryErrorsParams,
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
      data: Record<string, { depth: number; status: string }>;
    }>(`${BASE}/health/queues`);
    return Object.entries(r.data.data).map(([name, info]) => ({
      name,
      active: 0,
      waiting: info.depth,
      completed: 0,
      failed: 0,
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

  getAlertHistory: (params?: QueryAlertsParams) =>
    superAdminClient
      .get<{ data: AlertListResponse }>(`${BASE}/alerts/history`, { params })
      .then((r) => r.data.data),

  // ─── Errors ───

  getErrors: (params?: QueryErrorsParams) =>
    superAdminClient
      .get<{ data: ErrorGroup[] }>(`${BASE}/errors`, { params })
      .then((r) => r.data.data),
};
