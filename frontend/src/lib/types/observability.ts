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
  completed: number;
  failed: number;
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
