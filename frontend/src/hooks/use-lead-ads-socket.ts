"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { getSocket } from "@/lib/socket";
import { leadAdKeys } from "./use-lead-ads";
import type {
  WsLeadAdReceivedPayload,
  WsLeadAdFailedPayload,
} from "@/lib/types/lead-ads";

/**
 * Subscribes to Social Ads Lead WebSocket events and updates
 * TanStack Query cache in real-time.
 */
export function useLeadAdsSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket(accessToken);

    const onLeadReceived = (_payload: WsLeadAdReceivedPayload) => {
      queryClient.invalidateQueries({ queryKey: leadAdKeys.all });
      // Also refresh contacts list for new lead contact
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    };

    const onLeadFailed = (_payload: WsLeadAdFailedPayload) => {
      queryClient.invalidateQueries({ queryKey: leadAdKeys.all });
    };

    socket.on("lead_ad:received", onLeadReceived);
    socket.on("lead_ad:failed", onLeadFailed);

    return () => {
      socket.off("lead_ad:received", onLeadReceived);
      socket.off("lead_ad:failed", onLeadFailed);
    };
  }, [accessToken, queryClient]);
}
