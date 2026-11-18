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
  liveChannels: () => ["analytics", "live-channels"] as const,
  liveWaiting: () => ["analytics", "live-waiting"] as const,
  liveRevenue: () => ["analytics", "live-revenue"] as const,
  liveLeads: () => ["analytics", "live-leads"] as const,
  cityInsights: () => ["analytics", "city-insights"] as const,
};

/** Message City: messages per hour (today vs yesterday) and reply speed per channel */
export function useCityInsights() {
  return useQuery({
    queryKey: analyticsKeys.cityInsights(),
    queryFn: () => analyticsApi.getCityInsights({ timezoneOffsetMinutes: -new Date().getTimezoneOffset() }),
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

const localOffsetMinutes = () => -new Date().getTimezoneOffset();

/** Chats waiting 15+ minutes for a reply. Refetches each minute: waiting times grow on their own. */
export function useWaitingChats() {
  return useQuery({
    queryKey: analyticsKeys.liveWaiting(),
    queryFn: () => analyticsApi.getWaiting({ minMinutes: 15 }),
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

/** Pipeline value, deals won and proposals (last 7 days) */
export function useRevenueSnapshot() {
  return useQuery({
    queryKey: analyticsKeys.liveRevenue(),
    queryFn: () => analyticsApi.getRevenue(),
    staleTime: 30_000,
  });
}

/** Leads created today (Message City's dock) */
export function useLeadsToday() {
  return useQuery({
    queryKey: analyticsKeys.liveLeads(),
    queryFn: () => analyticsApi.getLeadsToday({ timezoneOffsetMinutes: localOffsetMinutes() }),
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

// ─── Query Hooks ───

/** Messages today per channel. The socket bumps it live; this refetch is the fallback. */
export function useLiveChannelStats() {
  return useQuery({
    queryKey: analyticsKeys.liveChannels(),
    queryFn: () =>
      // Exact minutes, so half-hour zones (India +5:30) start "today" at real midnight
      analyticsApi.getLiveChannels({ timezoneOffsetMinutes: -new Date().getTimezoneOffset() }),
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

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
