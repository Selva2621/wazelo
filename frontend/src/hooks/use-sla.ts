"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { slaApi } from "@/lib/api/sla";
import type {
  ListSlaPoliciesParams,
  ListSlaTrackingsParams,
  ListSlaBreachesParams,
  SlaPerformanceParams,
  CreateSlaPolicyRequest,
  UpdateSlaPolicyRequest,
} from "@/lib/types/sla";

// ─── Query Key Factory ───

export const slaKeys = {
  all: ["sla"] as const,
  policies: (params?: ListSlaPoliciesParams) =>
    ["sla", "policies", params] as const,
  policy: (id: string) => ["sla", "policies", id] as const,
  trackings: (params?: ListSlaTrackingsParams) =>
    ["sla", "trackings", params] as const,
  breaches: (params?: ListSlaBreachesParams) =>
    ["sla", "breaches", params] as const,
  performance: (params?: SlaPerformanceParams) =>
    ["sla", "performance", params] as const,
};

// ─── Query Hooks ───

export function useSlaPolicies(params?: ListSlaPoliciesParams) {
  return useQuery({
    queryKey: slaKeys.policies(params),
    queryFn: () => slaApi.listPolicies(params),
    staleTime: 60_000,
  });
}

export function useSlaPolicy(id: string) {
  return useQuery({
    queryKey: slaKeys.policy(id),
    queryFn: () => slaApi.getPolicy(id),
    staleTime: 60_000,
    enabled: !!id,
  });
}

export function useSlaTrackings(params?: ListSlaTrackingsParams) {
  return useQuery({
    queryKey: slaKeys.trackings(params),
    queryFn: () => slaApi.listTrackings(params),
    staleTime: 30_000,
  });
}

export function useSlaBreaches(params?: ListSlaBreachesParams) {
  return useQuery({
    queryKey: slaKeys.breaches(params),
    queryFn: () => slaApi.listBreaches(params),
    staleTime: 30_000,
  });
}

export function useSlaPerformance(params?: SlaPerformanceParams) {
  return useQuery({
    queryKey: slaKeys.performance(params),
    queryFn: () => slaApi.getPerformance(params),
    staleTime: 60_000,
  });
}

// ─── Mutation Hooks ───

export function useCreateSlaPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSlaPolicyRequest) => slaApi.createPolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla", "policies"] });
    },
  });
}

export function useUpdateSlaPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSlaPolicyRequest }) =>
      slaApi.updatePolicy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla", "policies"] });
    },
  });
}

export function useDeleteSlaPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => slaApi.deletePolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla", "policies"] });
    },
  });
}

export function useAcknowledgeSlaBrech() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => slaApi.acknowledgeBreach(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla", "breaches"] });
      queryClient.invalidateQueries({ queryKey: ["sla", "performance"] });
    },
  });
}
