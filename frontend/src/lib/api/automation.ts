import apiClient from "./client";
import type {
  AutomationRule,
  AutomationRuleListResponse,
  ExecutionLogListResponse,
  CreateAutomationRuleRequest,
  UpdateAutomationRuleRequest,
  ListAutomationRulesParams,
  ListExecutionLogsParams,
  GeneratedAutomationRuleResponse,
} from "@/lib/types/automation";

export const automationApi = {
  // ─── Rules CRUD ───

  create: (data: CreateAutomationRuleRequest) =>
    apiClient
      .post<AutomationRule>("/automation/rules", data)
      .then((r) => r.data),

  list: (params?: ListAutomationRulesParams) =>
    apiClient
      .get<AutomationRuleListResponse>("/automation/rules", { params })
      .then((r) => r.data),

  get: (ruleId: string) =>
    apiClient
      .get<AutomationRule>(`/automation/rules/${ruleId}`)
      .then((r) => r.data),

  update: (ruleId: string, data: UpdateAutomationRuleRequest) =>
    apiClient
      .patch<AutomationRule>(`/automation/rules/${ruleId}`, data)
      .then((r) => r.data),

  delete: (ruleId: string) =>
    apiClient.delete(`/automation/rules/${ruleId}`).then((r) => r.data),

  // ─── Rule Actions ───

  enable: (ruleId: string) =>
    apiClient
      .post<AutomationRule>(`/automation/rules/${ruleId}/enable`)
      .then((r) => r.data),

  disable: (ruleId: string) =>
    apiClient
      .post<AutomationRule>(`/automation/rules/${ruleId}/disable`)
      .then((r) => r.data),

  // ─── Execution Logs ───

  listLogs: (params?: ListExecutionLogsParams) =>
    apiClient
      .get<ExecutionLogListResponse>("/automation/logs", { params })
      .then((r) => r.data),

  // ─── AI Generation ───

  generate: (prompt: string) =>
    apiClient
      .post<GeneratedAutomationRuleResponse>("/automation/rules/generate", { prompt })
      .then((r) => r.data),
};
