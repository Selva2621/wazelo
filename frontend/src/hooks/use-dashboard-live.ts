"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { getSocket } from "@/lib/socket";
import { analyticsKeys } from "./use-analytics";

/** Anything that can change a dashboard number */
const EVENTS = [
  "whatsapp:message:received",
  "whatsapp:message:queued",
  "whatsapp:message:status",
  "channel:message:received",
  "channel:message:sent",
  "conversation:updated",
  "conversation:assigned",
  "contact:created",
  "contact:status_changed",
  "contact:assigned",
  "contact:reassigned",
  "lead_ad:received",
  "deal:auto-created",
  "sla:breach",
  "campaign:completed",
] as const;

/** How long to wait for a burst (a campaign, an import) to settle before refetching */
const SETTLE_MS = 2000;

/**
 * Keeps the dashboard live: any message, lead, deal or chat change refetches the
 * dashboard numbers once things go quiet for a moment, instead of every 60 seconds.
 */
export function useDashboardLive() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
        queryClient.invalidateQueries({ queryKey: ["lead-follow-ups", "mine"] });
      }, SETTLE_MS);
    };

    EVENTS.forEach((e) => socket.on(e, refresh));
    return () => {
      if (timer) clearTimeout(timer);
      EVENTS.forEach((e) => socket.off(e, refresh));
    };
  }, [accessToken, queryClient]);
}
