// ─── Enums (match backend Prisma enums) ───

export type AutomationTriggerType =
  | "MESSAGE_RECEIVED"
  | "CONTACT_CREATED"
  | "LEAD_STATUS_CHANGED"
  | "TIME_BASED"
  | "NO_REPLY"
  | "LEAD_AD_RECEIVED"
  | "SHOPIFY_ORDER_CREATED"
  | "SHOPIFY_ORDER_FULFILLED"
  | "SHOPIFY_CART_ABANDONED"
  | "WIDGET_MESSAGE_RECEIVED";

export type AutomationConditionOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "CONTAINS"
  | "IN"
  | "NOT_IN";

export type AutomationActionType =
  | "SEND_MESSAGE"
  | "ASSIGN_CONTACT"
  | "ADD_TAG"
  | "UPDATE_STATUS";

export type AutomationRuleStatus = "ACTIVE" | "INACTIVE";

export type AutomationExecutionStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED";

// ─── Trigger Config ───

export interface TriggerConfig {
  messageKeyword?: string;
  fromStatus?: string;
  toStatus?: string;
  cronExpression?: string;
  delaySeconds?: number;
}

// ─── Condition ───

export interface AutomationCondition {
  field: string;
  operator: AutomationConditionOperator;
  value: unknown;
}

// ─── Action ───

export interface AutomationAction {
  id: string;
  ruleId: string;
  orgId: string;
  actionType: AutomationActionType;
  actionConfig: Record<string, unknown>;
  orderIndex: number;
  delaySeconds: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Automation Rule ───

export interface AutomationRule {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  triggerType: AutomationTriggerType;
  triggerConfig: TriggerConfig;
  conditions: AutomationCondition[] | null;
  status: AutomationRuleStatus;
  priority: number;
  maxExecutionsPerContact: number;
  cooldownSeconds: number;
  loopPreventionKey: string | null;
  createdById: string;
  metadata: Record<string, unknown> | null;
  lastTriggeredAt: string | null;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
  actions: AutomationAction[];
}

// ─── Execution Log ───

export interface AutomationExecutionLog {
  id: string;
  ruleId: string;
  orgId: string;
  contactId: string | null;
  triggerEventType: string;
  triggerPayload: Record<string, unknown>;
  status: AutomationExecutionStatus;
  actionResults: Record<string, unknown>[] | null;
  error: string | null;
  idempotencyKey: string | null;
  startedAt: string | null;
  completedAt: string | null;
  retryCount: number;
  executionTimeMs: number | null;
  createdAt: string;
  rule: {
    name: string;
    triggerType: AutomationTriggerType;
  };
}

// ─── List Responses ───

export interface AutomationRuleListResponse {
  data: AutomationRule[];
  total: number;
}

export interface ExecutionLogListResponse {
  data: AutomationExecutionLog[];
  total: number;
}

// ─── Request DTOs ───

export interface ActionInput {
  actionType: AutomationActionType;
  actionConfig: Record<string, unknown>;
  orderIndex?: number;
  delaySeconds?: number;
}

export interface ConditionInput {
  field: string;
  operator: AutomationConditionOperator;
  value: unknown;
}

export interface CreateAutomationRuleRequest {
  name: string;
  description?: string;
  triggerType: AutomationTriggerType;
  triggerConfig: TriggerConfig;
  conditions?: ConditionInput[];
  actions: ActionInput[];
  priority?: number;
  maxExecutionsPerContact?: number;
  cooldownSeconds?: number;
  productId?: string;
}

export interface UpdateAutomationRuleRequest {
  name?: string;
  description?: string;
  triggerType?: AutomationTriggerType;
  triggerConfig?: TriggerConfig;
  conditions?: ConditionInput[];
  actions?: ActionInput[];
  priority?: number;
  maxExecutionsPerContact?: number;
  cooldownSeconds?: number;
}

// ─── AI Generation ───

export interface GeneratedRuleAction {
  actionType: AutomationActionType;
  actionConfig: Record<string, unknown>;
  orderIndex: number;
  delaySeconds?: number;
}

export interface GeneratedRule {
  name: string;
  description: string;
  triggerType: AutomationTriggerType;
  triggerConfig: TriggerConfig;
  actions: GeneratedRuleAction[];
  cooldownSeconds?: number;
  maxExecutionsPerContact?: number;
}

export interface GeneratedAutomationRuleResponse {
  rule: GeneratedRule;
  explanation: string;
}

// ─── Query Params ───

export interface ListAutomationRulesParams {
  triggerType?: AutomationTriggerType;
  status?: AutomationRuleStatus;
  limit?: number;
  offset?: number;
}

export interface ListExecutionLogsParams {
  ruleId?: string;
  status?: AutomationExecutionStatus;
  limit?: number;
  offset?: number;
}
