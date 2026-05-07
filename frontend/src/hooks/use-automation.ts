"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { automationApi } from "@/lib/api/automation";
import type {
  ListAutomationRulesParams,
  ListExecutionLogsParams,
  CreateAutomationRuleRequest,
  UpdateAutomationRuleRequest,
  GeneratedAutomationRuleResponse,
} from "@/lib/types/automation";

// ─── Query Key Factory ───

export const automationKeys = {
  all: ["automation"] as const,
  rules: ["automation", "rules"] as const,
  ruleList: (params?: ListAutomationRulesParams) =>
    ["automation", "rules", "list", params] as const,
  ruleDetail: (ruleId: string) => ["automation", "rules", ruleId] as const,
  logs: ["automation", "logs"] as const,
  logList: (params?: ListExecutionLogsParams) =>
    ["automation", "logs", "list", params] as const,
};

// ─── Query Hooks ───

export function useAutomationRules(params?: ListAutomationRulesParams) {
  return useQuery({
    queryKey: automationKeys.ruleList(params),
    queryFn: () => automationApi.list(params),
  });
}

export function useAutomationRule(ruleId: string | null) {
  return useQuery({
    queryKey: automationKeys.ruleDetail(ruleId!),
    queryFn: () => automationApi.get(ruleId!),
    enabled: !!ruleId,
  });
}

export function useExecutionLogs(params?: ListExecutionLogsParams) {
  return useQuery({
    queryKey: automationKeys.logList(params),
    queryFn: () => automationApi.listLogs(params),
  });
}

// ─── Mutation Hooks ───

export function useCreateAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAutomationRuleRequest) => automationApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: automationKeys.rules }); toast.success("Automation rule created"); },
    onError: (err: Error) => toast.error(err.message || "Failed to create automation rule"),
  });
}

export function useUpdateAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ruleId,
      ...data
    }: { ruleId: string } & UpdateAutomationRuleRequest) =>
      automationApi.update(ruleId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: automationKeys.rules });
      queryClient.invalidateQueries({ queryKey: automationKeys.ruleDetail(variables.ruleId) });
      toast.success("Automation rule updated");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update automation rule"),
  });
}

export function useDeleteAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => automationApi.delete(ruleId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: automationKeys.rules }); toast.success("Automation rule deleted"); },
    onError: (err: Error) => toast.error(err.message || "Failed to delete automation rule"),
  });
}

export function useEnableAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => automationApi.enable(ruleId),
    onSuccess: (_data, ruleId) => {
      queryClient.invalidateQueries({ queryKey: automationKeys.rules });
      queryClient.invalidateQueries({ queryKey: automationKeys.ruleDetail(ruleId) });
      toast.success("Automation rule enabled");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to enable automation rule"),
  });
}

export function useDisableAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => automationApi.disable(ruleId),
    onSuccess: (_data, ruleId) => {
      queryClient.invalidateQueries({ queryKey: automationKeys.rules });
      queryClient.invalidateQueries({ queryKey: automationKeys.ruleDetail(ruleId) });
      toast.success("Automation rule disabled");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to disable automation rule"),
  });
}

export function useGenerateAutomationRule() {
  return useMutation<GeneratedAutomationRuleResponse, Error, string>({
    mutationFn: (prompt: string) => automationApi.generate(prompt),
    onError: (err) => toast.error(err.message || "Failed to generate automation rule"),
  });
}
