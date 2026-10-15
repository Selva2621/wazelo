"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { conversationsApi } from "@/lib/api/conversations";
import { messagesApi } from "@/lib/api/messages";
import type {
  ListConversationsParams,
  ListMessagesParams,
  MessageResponse,
  MessagesListResponse,
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
    // Show the outgoing bubble immediately; the refetch on success swaps in the real message
    onMutate: async (data) => {
      if (!data.conversationId) return undefined;
      const key = conversationKeys.messages(data.conversationId);
      await queryClient.cancelQueries({ queryKey: key });

      const tempId = `temp-${Date.now()}`;
      const optimistic: MessageResponse = {
        id: tempId,
        orgId: "",
        sessionId: "",
        conversationId: data.conversationId,
        direction: "OUTBOUND",
        type: data.type ?? "TEXT",
        contactPhone: data.contactPhone,
        contactName: data.contactName ?? null,
        body: data.body ?? null,
        mediaUrl: data.mediaUrl ?? null,
        mediaMimeType: data.mediaMimeType ?? null,
        status: "QUEUED",
        whatsappMessageId: null,
        interactivePayload: data.interactive ?? null,
        idempotencyKey: data.idempotencyKey ?? null,
        retryCount: 0,
        failedReason: null,
        createdAt: new Date().toISOString(),
        channelPayload: data.channelPayload ?? null,
      };

      queryClient.setQueryData<MessagesListResponse>(key, (old) =>
        old ? { ...old, data: [optimistic, ...old.data], total: old.total + 1 } : old,
      );
      return { key, tempId };
    },
    onError: (_err, _data, ctx) => {
      if (!ctx) return;
      queryClient.setQueryData<MessagesListResponse>(ctx.key, (old) =>
        old
          ? {
              ...old,
              data: old.data.map((m) =>
                m.id === ctx.tempId ? { ...m, status: "FAILED" as const } : m,
              ),
            }
          : old,
      );
    },
    onSuccess: (_res, _data, ctx) => {
      if (ctx) queryClient.invalidateQueries({ queryKey: ctx.key });
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
