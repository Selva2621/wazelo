"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { conversationsApi } from "@/lib/api/conversations";
import { messagesApi } from "@/lib/api/messages";
import type {
  ListConversationsParams,
  ListMessagesParams,
  SendMessageRequest,
} from "@/lib/types/inbox";

export const conversationKeys = {
  all: ["conversations"] as const,
  list: (params?: ListConversationsParams) =>
    ["conversations", "list", params] as const,
  messages: (conversationId: string) =>
    ["messages", conversationId] as const,
  messageEvents: (messageId: string) =>
    ["messages", messageId, "events"] as const,
};

export function useConversations(params?: ListConversationsParams) {
  return useQuery({
    queryKey: conversationKeys.list(params),
    queryFn: () => conversationsApi.list(params),
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: conversationKeys.messages(conversationId!),
    queryFn: () =>
      messagesApi.list({ conversationId: conversationId! } as ListMessagesParams),
    enabled: !!conversationId,
  });
}

export function useMessageEvents(messageId: string | null) {
  return useQuery({
    queryKey: conversationKeys.messageEvents(messageId!),
    queryFn: () => messagesApi.getEvents(messageId!),
    enabled: !!messageId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendMessageRequest) => messagesApi.send(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.all,
      });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      conversationsApi.delete(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.all,
      });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      conversationsApi.markAsRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.all,
      });
    },
  });
}

export function useCloseConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      conversationsApi.close(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.all,
      });
    },
  });
}

export function useArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      conversationsApi.archive(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.all,
      });
    },
  });
}

export function useReopenConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      conversationsApi.reopen(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.all,
      });
    },
  });
}

export function useAssignConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      assignedToId,
    }: {
      conversationId: string;
      assignedToId: string | null;
    }) => conversationsApi.assign(conversationId, assignedToId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.all,
      });
    },
  });
}
