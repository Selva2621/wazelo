"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { getSocket } from "@/lib/socket";
import { channelKeys } from "./use-channels";
import { conversationKeys } from "./use-conversations";
import type {
  WsChannelCreatedPayload,
  WsChannelSuspendedPayload,
  WsChannelDeletedPayload,
  WsChannelMessagePayload,
} from "@/lib/types/channels";
import type {
  MessagesListResponse,
  MessageResponse,
} from "@/lib/types/inbox";

/**
 * Subscribes to EPIC 16 channel WebSocket events and updates
 * TanStack Query cache in real-time.
 *
 * Events handled:
 * - channel:created/suspended/deleted → invalidate channel list
 * - channel:message:received          → invalidate conversations + messages
 * - channel:message:delivered/read    → update message status in cache
 * - channel:message:failed            → update message status to FAILED
 */
export function useChannelSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket(accessToken);

    // ─── Channel lifecycle events ─────
    const onChannelCreated = (_payload: WsChannelCreatedPayload) => {
      queryClient.invalidateQueries({ queryKey: channelKeys.all });
    };

    const onChannelSuspended = (_payload: WsChannelSuspendedPayload) => {
      queryClient.invalidateQueries({ queryKey: channelKeys.all });
    };

    const onChannelDeleted = (_payload: WsChannelDeletedPayload) => {
      queryClient.invalidateQueries({ queryKey: channelKeys.all });
    };

    // ─── Channel message events ─────
    const onChannelMessageReceived = (_payload: WsChannelMessagePayload) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    };

    const onChannelMessageStatus = (payload: WsChannelMessagePayload) => {
      const status = payload.error ? "FAILED" : undefined;
      if (!payload.messageId) return;

      // Determine new status from event name (set by the caller below)
      queryClient.setQueriesData<MessagesListResponse>(
        { queryKey: ["messages"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((msg: MessageResponse) =>
              msg.id === payload.messageId
                ? { ...msg, status: status || msg.status }
                : msg,
            ),
          };
        },
      );
    };

    const onDelivered = (payload: WsChannelMessagePayload) => {
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

    const onRead = (payload: WsChannelMessagePayload) => {
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

    const onFailed = (payload: WsChannelMessagePayload) => {
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

    socket.on("channel:created", onChannelCreated);
    socket.on("channel:suspended", onChannelSuspended);
    socket.on("channel:deleted", onChannelDeleted);
    socket.on("channel:message:received", onChannelMessageReceived);
    socket.on("channel:message:sent", onChannelMessageStatus);
    socket.on("channel:message:delivered", onDelivered);
    socket.on("channel:message:read", onRead);
    socket.on("channel:message:failed", onFailed);

    return () => {
      socket.off("channel:created", onChannelCreated);
      socket.off("channel:suspended", onChannelSuspended);
      socket.off("channel:deleted", onChannelDeleted);
      socket.off("channel:message:received", onChannelMessageReceived);
      socket.off("channel:message:sent", onChannelMessageStatus);
      socket.off("channel:message:delivered", onDelivered);
      socket.off("channel:message:read", onRead);
      socket.off("channel:message:failed", onFailed);
    };
  }, [accessToken, queryClient]);
}
