// ─── Enums ───

export type SlaMetricType = "FIRST_RESPONSE_TIME" | "AVG_RESPONSE_TIME" | "RESOLUTION_TIME";
export type SlaPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
export type SlaBreachStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";

// ─── Policy ───

export interface EscalationLevel {
  delayMs: number;
  userIds: string[];
}

export interface SlaPolicy {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  metricType: SlaMetricType;
  priority: SlaPriority;
  thresholdMs: number;
  warningThresholdMs: number | null;
  isActive: boolean;
  businessHoursOnly: boolean;
  businessHoursStart: number | null;
  businessHoursEnd: number | null;
  businessDays: number[] | null;
  timezone: string | null;
  notifyOnWarning: boolean;
  notifyOnBreach: boolean;
  notifyUserIds: string[] | null;
  escalationPolicy: { levels: EscalationLevel[] } | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSlaPolicyRequest {
  name: string;
  description?: string;
  metricType: SlaMetricType;
  priority?: SlaPriority;
  thresholdMs: number;
  warningThresholdMs?: number;
  businessHoursOnly?: boolean;
  businessHoursStart?: number;
  businessHoursEnd?: number;
  businessDays?: number[];
  timezone?: string;
  notifyOnWarning?: boolean;
  notifyOnBreach?: boolean;
  notifyUserIds?: string[];
  escalationLevels?: EscalationLevel[];
}

export interface UpdateSlaPolicyRequest {
  name?: string;
  description?: string;
  metricType?: SlaMetricType;
  priority?: SlaPriority;
  thresholdMs?: number;
  warningThresholdMs?: number;
  isActive?: boolean;
  businessHoursOnly?: boolean;
  businessHoursStart?: number;
  businessHoursEnd?: number;
  businessDays?: number[];
  timezone?: string;
  notifyOnWarning?: boolean;
  notifyOnBreach?: boolean;
  notifyUserIds?: string[];
  escalationLevels?: EscalationLevel[];
}

// ─── Tracking ───

export interface SlaTracking {
  id: string;
  orgId: string;
  policyId: string;
  conversationId: string;
  assignedUserId: string | null;
  startedAt: string;
  respondedAt: string | null;
  resolvedAt: string | null;
  deadlineAt: string;
  warningAt: string | null;
  elapsedMs: number | null;
  isBreached: boolean;
  isWarning: boolean;
  pausedDurationMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface SlaTrackingsResponse {
  data: SlaTracking[];
  total: number;
}

// ─── Breach ───

export interface SlaBreachLog {
  id: string;
  orgId: string;
  policyId: string;
  conversationId: string;
  assignedUserId: string | null;
  metricType: SlaMetricType;
  thresholdMs: number;
  actualMs: number;
  status: SlaBreachStatus;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SlaBreachesResponse {
  data: SlaBreachLog[];
  total: number;
}

// ─── Performance ───

export interface SlaComplianceData {
  total: number;
  breached: number;
  complianceRate: number;
}

export interface SlaBreachByPolicy {
  policyId: string;
  count: number;
}

export interface SlaBreachByUser {
  assignedUserId: string;
  count: number;
}

export interface SlaAvgResponseByUser {
  assignedUserId: string;
  avgMs: number;
  count: number;
}

export interface SlaPerformanceResponse {
  period: { startDate: string; endDate: string };
  compliance: SlaComplianceData;
  breachByPolicy: SlaBreachByPolicy[];
  breachByUser: SlaBreachByUser[];
  avgResponseByUser: SlaAvgResponseByUser[];
}

// ─── Query Params ───

export interface ListSlaPoliciesParams {
  isActive?: boolean;
  metricType?: SlaMetricType;
  priority?: SlaPriority;
}

export interface ListSlaTrackingsParams {
  policyId?: string;
  conversationId?: string;
  assignedUserId?: string;
  isBreached?: boolean;
  isWarning?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface ListSlaBreachesParams {
  policyId?: string;
  conversationId?: string;
  assignedUserId?: string;
  status?: SlaBreachStatus;
  metricType?: SlaMetricType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface SlaPerformanceParams {
  policyId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

// ─── WebSocket Events ───

export interface SlaBreachWsEvent {
  breachId: string;
  policyId: string;
  policyName: string;
  conversationId: string;
  assignedUserId: string | null;
  metricType: SlaMetricType;
  thresholdMs: number;
  actualMs: number;
  createdAt: string;
}

export interface SlaWarningWsEvent {
  trackingId: string;
  policyId: string;
  policyName: string;
  conversationId: string;
  assignedUserId: string | null;
  elapsedMs: number;
  thresholdMs: number;
  warningThresholdMs: number;
}
