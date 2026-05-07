import apiClient from "./client";
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

export const observabilityApi = {
  // ─── Health ───

  getHealth: () =>
    apiClient.get<HealthCheck>("/observability/health").then((r) => r.data),

  getQueueHealth: async (): Promise<QueueHealth[]> => {
    const r = await apiClient.get<
      Record<string, { depth: number; status: string }>
    >("/observability/health/queues");
    return Object.entries(r.data).map(([name, info]) => ({
      name,
      active: 0,
      waiting: info.depth,
      completed: 0,
      failed: 0,
    }));
  },

  // ─── Metrics ───

  getMetrics: (params?: QueryMetricsParams) =>
    apiClient
      .get<AggregatedMetric[]>("/observability/metrics", { params })
      .then((r) => r.data),

  getTimeSeries: (params: QueryTimeSeriesParams) =>
    apiClient
      .get<TimeSeriesPoint[]>("/observability/metrics/timeseries", { params })
      .then((r) => r.data),

  getLatestMetrics: () =>
    apiClient
      .get<MetricSnapshot[]>("/observability/metrics/latest")
      .then((r) => r.data),

  // ─── Alerts ───

  listAlertRules: () =>
    apiClient.get<AlertRule[]>("/observability/alerts/rules").then((r) => r.data),

  createAlertRule: (data: CreateAlertRuleRequest) =>
    apiClient
      .post<AlertRule>("/observability/alerts/rules", data)
      .then((r) => r.data),

  getAlertHistory: (params?: QueryAlertsParams) =>
    apiClient
      .get<AlertListResponse>("/observability/alerts/history", { params })
      .then((r) => r.data),

  // ─── Errors ───

  getErrors: (params?: QueryErrorsParams) =>
    apiClient
      .get<ErrorGroup[]>("/observability/errors", { params })
      .then((r) => r.data),
};