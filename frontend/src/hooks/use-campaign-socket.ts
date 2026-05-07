"use client";

import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { getSocket } from "@/lib/socket";
import { campaignKeys } from "./use-campaigns";
import type {
  Campaign,
  CampaignListResponse,
  CampaignProgressPayload,
} from "@/lib/types/campaigns";

/**
 * Subscribes to campaign WebSocket events for real-time updates.
 *
 * Events handled:
 * - campaign:progress   → update campaign counters in cache
 * - campaign:started    → invalidate campaigns list
 * - campaign:completed  → update campaign status in cache
 * - campaign:paused     → update campaign status in cache
 * - campaign:resumed    → update campaign status in cache
 * - campaign:failed     → update campaign status in cache
 * - campaign:cancelled  → update campaign status in cache
 */
export function useCampaignSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const updateCampaignInCache = useCallback(
    (campaignId: string, patch: Partial<Campaign>) => {
      // Update detail cache
      queryClient.setQueryData<Campaign>(
        campaignKeys.detail(campaignId),
        (old) => (old ? { ...old, ...patch } : old),
      );

      // Update list caches
      queryClient.setQueriesData<CampaignListResponse>(
        { queryKey: ["campaigns", "list"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((c) =>
              c.id === campaignId ? { ...c, ...patch } : c,
            ),
          };
        },
      );
    },
    [queryClient],
  );

  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket(accessToken);

    const onProgress = (payload: CampaignProgressPayload) => {
      updateCampaignInCache(payload.campaignId, {
        totalRecipients: payload.totalRecipients,
        sentCount: payload.sentCount,
        deliveredCount: payload.deliveredCount,
        failedCount: payload.failedCount,
        readCount: payload.readCount,
      });
    };

    const onStatusChange = (payload: {
      campaignId: string;
      orgId: string;
    }) => {
      // Refetch to get full updated campaign
      queryClient.invalidateQueries({
        queryKey: campaignKeys.detail(payload.campaignId),
      });
      queryClient.invalidateQueries({
        queryKey: campaignKeys.analytics(payload.campaignId),
      });
      queryClient.invalidateQueries({ queryKey: ["campaigns", "list"] });
    };

    socket.on("campaign:progress", onProgress);
    socket.on("campaign:started", onStatusChange);
    socket.on("campaign:completed", onStatusChange);
    socket.on("campaign:paused", onStatusChange);
    socket.on("campaign:resumed", onStatusChange);
    socket.on("campaign:failed", onStatusChange);
    socket.on("campaign:cancelled", onStatusChange);

    return () => {
      socket.off("campaign:progress", onProgress);
      socket.off("campaign:started", onStatusChange);
      socket.off("campaign:completed", onStatusChange);
      socket.off("campaign:paused", onStatusChange);
      socket.off("campaign:resumed", onStatusChange);
      socket.off("campaign:failed", onStatusChange);
      socket.off("campaign:cancelled", onStatusChange);
    };
  }, [accessToken, queryClient, updateCampaignInCache]);
}
