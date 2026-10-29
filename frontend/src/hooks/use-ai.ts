"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { aiApi } from "@/lib/api/ai";
import type { RoutingSuggestion, AiInsightsResult, CampaignCopyResult, DealScoreResult } from "@/lib/api/ai";
import type { SmartReplyOptions } from "@/lib/types/ai";

/**
 * Conversation AI results cost credits per call, so they run only when asked
 * (`enabled`) and are kept for the session instead of refetching on revisit.
 */
const AI_RESULT_CACHE = { staleTime: Infinity, gcTime: 30 * 60_000, refetchOnWindowFocus: false } as const;

const chatReadKey = (conversationId: string | null) => ["ai", "read-chat", conversationId] as const;

/**
 * The saved AI read of a chat (free, no AI call). Re-checked whenever the chat is
 * opened, so "they've written since" shows up without spending anything.
 */
export function useChatRead(conversationId: string | null) {
  return useQuery({
    queryKey: chatReadKey(conversationId),
    queryFn: () => aiApi.peekChat(conversationId!),
    enabled: !!conversationId,
    staleTime: 10_000,
    // A database look-up, not an AI call: notices new customer messages while the chat is open
    refetchInterval: 30_000,
  });
}

/** Reads the chat with the AI (1 credit; free when nothing new since the last read) */
export function useReadChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => aiApi.readChat(conversationId),
    onSuccess: (data, conversationId) => {
      qc.setQueryData(chatReadKey(conversationId), data);
      qc.invalidateQueries({ queryKey: ["ai-credits"] });
    },
  });
}

/** One credit-metered call per click; tone and goal change what comes back, so nothing is cached */
export function useSuggestReplies() {
  return useMutation({
    mutationFn: ({ conversationId, ...options }: { conversationId: string } & SmartReplyOptions) =>
      aiApi.getSmartReplies(conversationId, options),
  });
}

export function useSummarizeConversation() {
  return useMutation({
    mutationFn: (conversationId: string) => aiApi.summarize(conversationId),
    onError: (err: Error) => toast.error(err.message || "Failed to summarize conversation"),
  });
}

export function useSentiment(conversationId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["ai", "sentiment", conversationId],
    queryFn: () => aiApi.getSentiment(conversationId!),
    enabled: !!conversationId && enabled,
    ...AI_RESULT_CACHE,
  });
}

export function useCategorization(conversationId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["ai", "categorization", conversationId],
    queryFn: () => aiApi.getCategorization(conversationId!),
    enabled: !!conversationId && enabled,
    ...AI_RESULT_CACHE,
  });
}

export function useSaveTagsToContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, ...body }: { conversationId: string } & Parameters<typeof aiApi.saveTagsToContact>[1]) =>
      aiApi.saveTagsToContact(conversationId, body),
    // Contact tags and the org's tag list all live under ["contacts"]
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
    onError: (err: Error & { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message || "Couldn't save the tag"),
  });
}

export function useKbSearch(query: string) {
  return useQuery({
    queryKey: ["ai", "kb-search", query],
    queryFn: () => aiApi.kbSearch(query),
    enabled: query.length >= 3,
    staleTime: 120_000,
  });
}

export function useKbSuggest(conversationId: string | null) {
  return useQuery({
    queryKey: ["ai", "kb-suggest", conversationId],
    queryFn: () => aiApi.kbSuggest(conversationId!),
    enabled: !!conversationId,
    ...AI_RESULT_CACHE,
  });
}

export function useDetectIntent(conversationId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["ai", "intent", conversationId],
    queryFn: () => aiApi.detectIntent(conversationId!),
    enabled: !!conversationId && enabled,
    ...AI_RESULT_CACHE,
  });
}

export function useFullAnalysis() {
  return useMutation({
    mutationFn: (conversationId: string) => aiApi.fullAnalysis(conversationId),
    onError: (err: Error) => toast.error(err.message || "Failed to run full analysis"),
  });
}

export function useRoutingSuggestion(conversationId: string | null) {
  return useQuery<RoutingSuggestion>({
    queryKey: ["ai", "routing", conversationId],
    queryFn: () => aiApi.getRoutingSuggestion(conversationId!),
    enabled: !!conversationId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useAiInsights(period: "7d" | "30d" = "7d") {
  return useQuery<AiInsightsResult>({
    queryKey: ["ai", "insights", period],
    queryFn: () => aiApi.getInsights(period),
    staleTime: 5 * 60_000, // 5 min — insights don't change every second
    refetchOnWindowFocus: false,
  });
}

export function useGenerateCampaignCopy() {
  return useMutation<
    CampaignCopyResult,
    Error,
    { goal: string; audienceDesc?: string; tone?: string; variants?: number }
  >({
    mutationFn: (params) => aiApi.generateCampaignCopy(params),
    onError: (err) => toast.error(err.message || "Failed to generate campaign copy"),
  });
}

export function useScoreDeal() {
  const qc = useQueryClient();
  return useMutation<DealScoreResult, Error, { pipelineId: string; dealId: string }>({
    mutationFn: ({ pipelineId, dealId }) => aiApi.scoreDeal(pipelineId, dealId),
    onSuccess: (_data, { dealId }) => {
      qc.invalidateQueries({ queryKey: ["deals", dealId] });
    },
    onError: (err) => toast.error(err.message || "Failed to score deal"),
  });
}
