"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leadAdsApi } from "@/lib/api/lead-ads";
import type { LeadAdListParams, LeadAdAnalyticsParams, SaveLeadAdsConfigPayload } from "@/lib/types/lead-ads";

// ─── Query Key Factory ───

export const leadAdKeys = {
  all: ["lead-ads"] as const,
  entries: (params?: LeadAdListParams) =>
    ["lead-ads", "entries", params] as const,
  entry: (id: string) => ["lead-ads", "entries", id] as const,
  analytics: (params?: LeadAdAnalyticsParams) =>
    ["lead-ads", "analytics", params] as const,
  config: () => ["lead-ads", "config"] as const,
};

// ─── Query Hooks ───

export function useLeadAdEntries(params?: LeadAdListParams) {
  return useQuery({
    queryKey: leadAdKeys.entries(params),
    queryFn: () => leadAdsApi.listEntries(params),
    staleTime: 30_000,
  });
}

export function useLeadAdEntry(id: string) {
  return useQuery({
    queryKey: leadAdKeys.entry(id),
    queryFn: () => leadAdsApi.getEntry(id),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useLeadAdAnalytics(params?: LeadAdAnalyticsParams) {
  return useQuery({
    queryKey: leadAdKeys.analytics(params),
    queryFn: () => leadAdsApi.getAnalytics(params),
    staleTime: 60_000,
  });
}

export function useLeadAdConfig() {
  return useQuery({
    queryKey: leadAdKeys.config(),
    queryFn: () => leadAdsApi.getConfig(),
    staleTime: 60_000,
  });
}

// ─── Mutation Hooks ───

export function useRetryLeadAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadAdsApi.retryEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadAdKeys.all });
    },
  });
}

export function useSaveLeadAdsConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveLeadAdsConfigPayload) =>
      leadAdsApi.saveConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadAdKeys.config() });
    },
  });
}
