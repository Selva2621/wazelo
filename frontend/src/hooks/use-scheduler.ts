"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schedulerApi } from "@/lib/api/scheduler";
import type {
  ListScheduledMessagesParams,
  CreateScheduledMessageRequest,
  UpdateScheduledMessageRequest,
} from "@/lib/types/scheduler";

// ─── Query Key Factory ───

export const schedulerKeys = {
  all: ["scheduledMessages"] as const,
  list: (params?: ListScheduledMessagesParams) =>
    ["scheduledMessages", "list", params] as const,
  detail: (messageId: string) => ["scheduledMessages", messageId] as const,
};

// ─── Query Hooks ───

export function useScheduledMessages(params?: ListScheduledMessagesParams) {
  return useQuery({
    queryKey: schedulerKeys.list(params),
    queryFn: () => schedulerApi.list(params),
  });
}

export function useScheduledMessage(messageId: string | null) {
  return useQuery({
    queryKey: schedulerKeys.detail(messageId!),
    queryFn: () => schedulerApi.get(messageId!),
    enabled: !!messageId,
  });
}

// ─── Mutation Hooks ───

export function useCreateScheduledMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateScheduledMessageRequest) =>
      schedulerApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulerKeys.all });
    },
  });
}

export function useUpdateScheduledMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      messageId,
      ...data
    }: { messageId: string } & UpdateScheduledMessageRequest) =>
      schedulerApi.update(messageId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: schedulerKeys.all });
      queryClient.invalidateQueries({
        queryKey: schedulerKeys.detail(variables.messageId),
      });
    },
  });
}

export function useCancelScheduledMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => schedulerApi.cancel(messageId),
    onSuccess: (_data, messageId) => {
      queryClient.invalidateQueries({ queryKey: schedulerKeys.all });
      queryClient.invalidateQueries({
        queryKey: schedulerKeys.detail(messageId),
      });
    },
  });
}
