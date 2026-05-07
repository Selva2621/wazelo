"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { chatbotApi } from "@/lib/api/chatbot";
import type { CreateFlowRequest, UpdateFlowRequest, SaveNodesRequest, SimulateFlowRequest } from "@/lib/types/chatbot";

export const chatbotKeys = {
  all: ["chatbot"] as const,
  flows: () => ["chatbot", "flows"] as const,
  flow: (id: string) => ["chatbot", "flows", id] as const,
  analytics: (id: string) => ["chatbot", "analytics", id] as const,
};

export function useChatbotFlows() {
  return useQuery({
    queryKey: chatbotKeys.flows(),
    queryFn: () => chatbotApi.listFlows(),
  });
}

export function useChatbotFlow(flowId: string | null) {
  return useQuery({
    queryKey: chatbotKeys.flow(flowId!),
    queryFn: () => chatbotApi.getFlow(flowId!),
    enabled: !!flowId,
  });
}

export function useChatbotFlowAnalytics(flowId: string | null) {
  return useQuery({
    queryKey: chatbotKeys.analytics(flowId!),
    queryFn: () => chatbotApi.getAnalytics(flowId!),
    enabled: !!flowId,
  });
}

export function useCreateChatbotFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFlowRequest) => chatbotApi.createFlow(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: chatbotKeys.all }),
  });
}

export function useUpdateChatbotFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ flowId, ...data }: UpdateFlowRequest & { flowId: string }) =>
      chatbotApi.updateFlow(flowId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: chatbotKeys.all }),
  });
}

export function useSaveChatbotNodes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ flowId, ...data }: SaveNodesRequest & { flowId: string }) =>
      chatbotApi.saveNodes(flowId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: chatbotKeys.all }),
  });
}

export function useActivateChatbotFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (flowId: string) => chatbotApi.activateFlow(flowId),
    onSuccess: () => qc.invalidateQueries({ queryKey: chatbotKeys.all }),
  });
}

export function useDeactivateChatbotFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (flowId: string) => chatbotApi.deactivateFlow(flowId),
    onSuccess: () => qc.invalidateQueries({ queryKey: chatbotKeys.all }),
  });
}

export function useDeleteChatbotFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (flowId: string) => chatbotApi.deleteFlow(flowId),
    onSuccess: () => qc.invalidateQueries({ queryKey: chatbotKeys.all }),
  });
}

export function useSimulateChatbotFlow() {
  return useMutation({
    mutationFn: ({ flowId, ...data }: SimulateFlowRequest & { flowId: string }) =>
      chatbotApi.simulateFlow(flowId, data),
    onError: (err: Error) => toast.error(err.message || "Simulation failed"),
  });
}
