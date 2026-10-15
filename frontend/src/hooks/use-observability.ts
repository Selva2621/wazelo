"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { observabilityApi } from "@/lib/api/observability";
import type {
  QueryMetricsParams,
  QueryTimeSeriesParams,
  QueryAlertsParams,
  QueryErrorsParams,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  QueryFailedJobsParams,
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
  failedJobsAll: () => ["observability", "failed-jobs"] as const,
  failedJobs: (params?: QueryFailedJobsParams) =>
    ["observability", "failed-jobs", params] as const,
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

export function useFailedJobs(params?: QueryFailedJobsParams) {
  return useQuery({
    queryKey: observabilityKeys.failedJobs(params),
    queryFn: () => observabilityApi.getFailedJobs(params),
    placeholderData: (prev) => prev,
  });
}

// ─── Mutation Hooks ───

export function useRetryJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => observabilityApi.retryJob(id),
    onSettled: () => {
      // Also on error: a 400/404 means the list is stale (already retried / job gone)
      queryClient.invalidateQueries({ queryKey: observabilityKeys.failedJobsAll() });
      queryClient.invalidateQueries({ queryKey: observabilityKeys.queues() });
    },
  });
}

export function useUpdateAlertRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAlertRuleRequest }) =>
      observabilityApi.updateAlertRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: observabilityKeys.alertRules() });
    },
  });
}

export function useDeleteAlertRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => observabilityApi.deleteAlertRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: observabilityKeys.alertRules() });
    },
  });
}

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
