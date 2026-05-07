"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { observabilityApi } from "@/lib/api/observability";
import type {
  QueryMetricsParams,
  QueryTimeSeriesParams,
  QueryAlertsParams,
  QueryErrorsParams,
  CreateAlertRuleRequest,
} from "@/lib/types/observability";

// ─── Query Key Factory ───

export const observabilityKeys = {
  all: ["observability"] as const,
  health: () => ["observability", "health"] as const,
  queues: () => ["observability", "queues"] as const,
  metrics: (params?: QueryMetricsParams) =>
    ["observability", "metrics", params] as const,
  timeseries: (params: QueryTimeSeriesParams) =>
    ["observability", "timeseries", params] as const,
  latest: () => ["observability", "latest"] as const,
  alertRules: () => ["observability", "alert-rules"] as const,
  alertHistory: (params?: QueryAlertsParams) =>
    ["observability", "alert-history", params] as const,
  errors: (params?: QueryErrorsParams) =>
    ["observability", "errors", params] as const,
};

// ─── Query Hooks ───

export function useHealth() {
  return useQuery({
    queryKey: observabilityKeys.health(),
    queryFn: () => observabilityApi.getHealth(),
    refetchInterval: 30000,
  });
}

export function useQueueHealth() {
  return useQuery({
    queryKey: observabilityKeys.queues(),
    queryFn: () => observabilityApi.getQueueHealth(),
    refetchInterval: 30000,
  });
}

export function useMetrics(params?: QueryMetricsParams) {
  return useQuery({
    queryKey: observabilityKeys.metrics(params),
    queryFn: () => observabilityApi.getMetrics(params),
  });
}

export function useTimeSeries(params: QueryTimeSeriesParams) {
  return useQuery({
    queryKey: observabilityKeys.timeseries(params),
    queryFn: () => observabilityApi.getTimeSeries(params),
    enabled: !!params.metric,
  });
}

export function useLatestMetrics() {
  return useQuery({
    queryKey: observabilityKeys.latest(),
    queryFn: () => observabilityApi.getLatestMetrics(),
    refetchInterval: 15000,
  });
}

export function useAlertRules() {
  return useQuery({
    queryKey: observabilityKeys.alertRules(),
    queryFn: () => observabilityApi.listAlertRules(),
  });
}

export function useAlertHistory(params?: QueryAlertsParams) {
  return useQuery({
    queryKey: observabilityKeys.alertHistory(params),
    queryFn: () => observabilityApi.getAlertHistory(params),
  });
}

export function useErrors(params?: QueryErrorsParams) {
  return useQuery({
    queryKey: observabilityKeys.errors(params),
    queryFn: () => observabilityApi.getErrors(params),
  });
}

// ─── Mutation Hooks ───

export function useCreateAlertRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAlertRuleRequest) =>
      observabilityApi.createAlertRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: observabilityKeys.alertRules(),
      });
    },
  });
}
