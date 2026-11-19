"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { getSocket } from "@/lib/socket";

/**
 * Inbox → Website live updates: a visitor wrote, asked for a person, someone took
 * the chat, an offer ran out… The list and the open chat refresh at once instead
 * of waiting for the next poll.
 */
export function useWebsiteChatSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);
    const refresh = (payload?: { sessionId?: string }) => {
      void qc.invalidateQueries({ queryKey: ["website-chats"] });
      if (payload?.sessionId) {
        void qc.invalidateQueries({ queryKey: ["website-chat", payload.sessionId] });
        void qc.invalidateQueries({ queryKey: ["website-chat-timeline", payload.sessionId] });
      }
    };
    socket.on("website-chat:updated", refresh);
    socket.on("website-chat:offer", refresh);
    socket.on("website-chat:offer-closed", refresh);
    return () => {
      socket.off("website-chat:updated", refresh);
      socket.off("website-chat:offer", refresh);
      socket.off("website-chat:offer-closed", refresh);
    };
  }, [accessToken, qc]);
}
