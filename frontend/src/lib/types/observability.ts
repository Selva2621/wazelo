// ─── Health ───

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface ComponentHealth {
  status: HealthStatus;
  latency?: number;
  connections?: number;
  details?: Record<string, unknown>;
}

export interface HealthCheck {
  status: HealthStatus;
  uptime: number;
  components: {
    database: ComponentHealth;
    queue: ComponentHealth;
    websocket: ComponentHealth;
  };
  metrics: {
    activeWebSocketConnections: number;
    queueDepths: Record<string, number>;
    errorRate: number;
    recentErrors: number;
  };
  timestamp: string;
}

export interface QueueHealth {
  name: string;
  active: number;
  waiting: number;
  /** Finished in the last `windowHours` */
  completed: number;
  /** Failed or expired in the last `windowHours` */
  failed: number;
  windowHours: number;
  /** From the waiting depth */
  status: "healthy" | "warning" | "critical";
}

// ─── Failed jobs ───

export interface FailedJob {
  id: string;
  queue: string;
  state: "failed" | "expired";
  attempts: number;
  createdAt: string;
  failedAt: string;
  error: string | null;
  /** Job payload; secrets are redacted by the server */
  data: unknown;
  /** True once this job has been re-queued, so it can't be retried again */
  retried: boolean;
}

export interface FailedJobsResponse {
  jobs: FailedJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryFailedJobsParams {
  page?: number;
  limit?: number;
  queue?: string;
}

export interface RetryJobResponse {
  jobId: string;
  newJobId: string;
  queue: string;
}

// ─── Metrics ───

export interface MetricSnapshot {
  metric: string;
  value: number;
  tags?: Record<string, string>;
  createdAt: string;
}

export interface AggregatedMetric {
  metric: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export interface TimeSeriesPoint {
  bucket: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export interface QueryMetricsParams {
  metric?: string;
  from?: string;
  to?: string;
}

export interface QueryTimeSeriesParams {
  metric: string;
  from?: string;
  to?: string;
  interval?: string;
}

// ─── Alerts ───

export type AlertCondition = "gt" | "lt" | "gte" | "lte" | "eq";

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  windowSeconds: number;
  channels: string[];
  channelConfig: Record<string, unknown>;
  enabled: boolean;
  cooldownSeconds: number;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertEvent {
  id: string;
  alertRuleId: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  channels: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateAlertRuleRequest {
  name: string;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  windowSeconds: number;
  channels: string[];
  channelConfig: Record<string, unknown>;
  enabled?: boolean;
  cooldownSeconds?: number;
}

/** PATCH body: any subset of the create fields */
export type UpdateAlertRuleRequest = Partial<CreateAlertRuleRequest>;

export interface AlertListResponse {
  data: AlertEvent[];
  total: number;
}

export interface QueryAlertsParams {
  limit?: number;
  offset?: number;
}

// ─── Errors ───

export interface ErrorGroup {
  fingerprint: string;
  message: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  context?: string;
}

export interface QueryErrorsParams {
  windowMinutes?: number;
}
