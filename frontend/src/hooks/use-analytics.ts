"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/analytics";
import type {
  AnalyticsQueryParams,
  BackfillRequest,
} from "@/lib/types/analytics";

// ─── Query Key Factory ───

export const analyticsKeys = {
  all: ["analytics"] as const,
  dashboard: (params?: AnalyticsQueryParams) =>
    ["analytics", "dashboard", params] as const,
  messages: (params?: AnalyticsQueryParams) =>
    ["analytics", "messages", params] as const,
  responseTime: (params?: AnalyticsQueryParams) =>
    ["analytics", "response-time", params] as const,
  conversionFunnel: (params?: AnalyticsQueryParams) =>
    ["analytics", "conversion-funnel", params] as const,
  peakHours: (params?: AnalyticsQueryParams) =>
    ["analytics", "peak-hours", params] as const,
  teamPerformance: (params?: AnalyticsQueryParams) =>
    ["analytics", "team-performance", params] as const,
  campaigns: (params?: AnalyticsQueryParams) =>
    ["analytics", "campaigns", params] as const,
};

// ─── Query Hooks ───

export function useDashboardAnalytics(params?: AnalyticsQueryParams) {
  return useQuery({
    queryKey: analyticsKeys.dashboard(params),
    queryFn: () => analyticsApi.getDashboard(params),
    staleTime: 60_000,
  });
}

export function useMessageVolume(params?: AnalyticsQueryParams) {
  return useQuery({
    queryKey: analyticsKeys.messages(params),
    queryFn: () => analyticsApi.getMessages(params),
    staleTime: 60_000,
  });
}

export function useResponseTime(params?: AnalyticsQueryParams) {
  return useQuery({
    queryKey: analyticsKeys.responseTime(params),
    queryFn: () => analyticsApi.getResponseTime(params),
    staleTime: 60_000,
  });
}

export function useConversionFunnel(params?: AnalyticsQueryParams) {
  return useQuery({
    queryKey: analyticsKeys.conversionFunnel(params),
    queryFn: () => analyticsApi.getConversionFunnel(params),
    staleTime: 60_000,
  });
}

export function usePeakHours(params?: AnalyticsQueryParams) {
  return useQuery({
    queryKey: analyticsKeys.peakHours(params),
    queryFn: () => analyticsApi.getPeakHours(params),
    staleTime: 60_000,
  });
}

export function useTeamPerformance(params?: AnalyticsQueryParams) {
  return useQuery({
    queryKey: analyticsKeys.teamPerformance(params),
    queryFn: () => analyticsApi.getTeamPerformance(params),
    staleTime: 60_000,
    enabled: params !== undefined,
  });
}

export function useCampaignSummary(params?: AnalyticsQueryParams) {
  return useQuery({
    queryKey: analyticsKeys.campaigns(params),
    queryFn: () => analyticsApi.getCampaigns(params),
    staleTime: 60_000,
  });
}

// ─── Mutation Hooks ───

export function useBackfill() {
  return useMutation({
    mutationFn: (data: BackfillRequest) => analyticsApi.triggerBackfill(data),
  });
}
