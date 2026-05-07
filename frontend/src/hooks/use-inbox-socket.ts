"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { getSocket } from "@/lib/socket";
import { conversationKeys } from "./use-conversations";
import type {
  WsMessageReceivedPayload,
  WsMessageStatusPayload,
  WsConversationUpdatedPayload,
  ConversationResponse,
  ConversationListResponse,
  MessageResponse,
  MessagesListResponse,
} from "@/lib/types/inbox";

/**
 * Subscribes to EPIC 5 messaging WebSocket events and updates
 * TanStack Query cache in real-time.
 *
 * Events handled:
 * - whatsapp:message:received → invalidate conversations + messages
 * - whatsapp:message:status  → update message status in cache
 * - conversation:updated     → patch conversation in list cache
 */
export function useInboxSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket(accessToken);

    // ─── New incoming message ─────
    const onMessageReceived = (payload: WsMessageReceivedPayload) => {
      // Invalidate conversation list (new message changes order/unread)
      queryClient.invalidateQueries({ queryKey: conversationKeys.all });

      // Invalidate messages for any active conversation with this contact
      // (we don't know the conversationId here, so invalidate all messages)
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    };

    // ─── Message status update ─────
    const onMessageStatus = (payload: WsMessageStatusPayload) => {
      // Update message status in all message list caches
      queryClient.setQueriesData<MessagesListResponse>(
        { queryKey: ["messages"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((msg: MessageResponse) =>
              msg.id === payload.messageId
                ? { ...msg, status: payload.status, failedReason: payload.reason ?? msg.failedReason }
                : msg,
            ),
          };
        },
      );
    };

    // ─── Conversation updated (last message, unread count) ─────
    const onConversationUpdated = (payload: WsConversationUpdatedPayload) => {
      queryClient.setQueriesData<ConversationListResponse>(
        { queryKey: conversationKeys.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((conv: ConversationResponse) =>
              conv.id === payload.conversationId
                ? {
                    ...conv,
                    lastMessageAt: payload.lastMessageAt,
                    lastMessageBody: payload.lastMessageBody,
                    unreadCount: payload.unreadCount,
                  }
                : conv,
            ),
          };
        },
      );
    };

    // ─── Channel message events (EPIC 16) ─────
    const onChannelMessageReceived = () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    };

    const onChannelMessageDelivered = (payload: { messageId: string }) => {
      queryClient.setQueriesData<MessagesListResponse>(
        { queryKey: ["messages"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((msg: MessageResponse) =>
              msg.id === payload.messageId
                ? { ...msg, status: "DELIVERED" as const }
                : msg,
            ),
          };
        },
      );
    };

    const onChannelMessageRead = (payload: { messageId: string }) => {
      queryClient.setQueriesData<MessagesListResponse>(
        { queryKey: ["messages"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((msg: MessageResponse) =>
              msg.id === payload.messageId
                ? { ...msg, status: "READ" as const }
                : msg,
            ),
          };
        },
      );
    };

    const onChannelMessageFailed = (payload: { messageId: string; error?: string }) => {
      queryClient.setQueriesData<MessagesListResponse>(
        { queryKey: ["messages"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((msg: MessageResponse) =>
              msg.id === payload.messageId
                ? { ...msg, status: "FAILED" as const, failedReason: payload.error ?? null }
                : msg,
            ),
          };
        },
      );
    };

    // ─── Conversation assigned ─────
    const onConversationAssigned = (payload: { conversationId: string; assignedToId: string | null }) => {
      queryClient.setQueriesData<ConversationListResponse>(
        { queryKey: conversationKeys.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((conv: ConversationResponse) =>
              conv.id === payload.conversationId
                ? { ...conv, assignedToId: payload.assignedToId }
                : conv,
            ),
          };
        },
      );
    };

    socket.on("whatsapp:message:received", onMessageReceived);
    socket.on("whatsapp:message:queued", onMessageReceived); // Same handling
    socket.on("whatsapp:message:status", onMessageStatus);
    socket.on("conversation:updated", onConversationUpdated);
    // EPIC 16 — Channel message events
    socket.on("channel:message:received", onChannelMessageReceived);
    socket.on("channel:message:delivered", onChannelMessageDelivered);
    socket.on("channel:message:read", onChannelMessageRead);
    socket.on("channel:message:failed", onChannelMessageFailed);
    socket.on("conversation:assigned", onConversationAssigned);

    return () => {
      socket.off("whatsapp:message:received", onMessageReceived);
      socket.off("whatsapp:message:queued", onMessageReceived);
      socket.off("whatsapp:message:status", onMessageStatus);
      socket.off("conversation:updated", onConversationUpdated);
      socket.off("channel:message:received", onChannelMessageReceived);
      socket.off("channel:message:delivered", onChannelMessageDelivered);
      socket.off("channel:message:read", onChannelMessageRead);
      socket.off("channel:message:failed", onChannelMessageFailed);
      socket.off("conversation:assigned", onConversationAssigned);
    };
  }, [accessToken, queryClient]);
}
