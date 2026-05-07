"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { csatApi } from "@/lib/api/csat";
import type { CsatStatsParams } from "@/lib/types/csat";

export const csatKeys = {
  all: ["csat"] as const,
  stats: (params?: CsatStatsParams) => ["csat", "stats", params] as const,
  surveys: (params?: Record<string, unknown>) =>
    ["csat", "surveys", params] as const,
};

export function useCsatStats(params?: CsatStatsParams) {
  return useQuery({
    queryKey: csatKeys.stats(params),
    queryFn: () => csatApi.getStats(params),
    staleTime: 60_000,
  });
}

export function useCsatSurveys(params?: {
  take?: number;
  skip?: number;
  agentId?: string;
}) {
  return useQuery({
    queryKey: csatKeys.surveys(params),
    queryFn: () => csatApi.listSurveys(params),
    staleTime: 30_000,
  });
}

export function useSendCsatSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      conversationId: string;
      contactPhone: string;
      sessionId?: string;
      channelType?: string;
    }) => csatApi.sendSurvey(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csatKeys.all });
    },
  });
}

export function useSurvey(conversationId: string) {
  return useQuery({
    queryKey: ["csat", "survey", conversationId],
    queryFn: () => csatApi.getSurvey(conversationId),
    enabled: !!conversationId,
    retry: false,
  });
}

export function useSubmitSurvey(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rating, comment }: { rating: number; comment?: string }) =>
      csatApi.submitSurvey(conversationId, rating, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["csat", "survey", conversationId] });
    },
  });
}
