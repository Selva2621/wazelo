"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { getSocket } from "@/lib/socket";
import { analyticsKeys } from "./use-analytics";
import { useCityStore } from "@/components/message-city/use-city-store";
import type { LiveChannelKey, LiveChannelStatsResponse } from "@/lib/types/analytics";
import type { WsChannelMessagePayload } from "@/lib/types/channels";

const CITY_CHANNEL_KEYS: LiveChannelKey[] = ["WHATSAPP", "INSTAGRAM", "FACEBOOK_MESSENGER"];
const LABEL: Record<string, string> = { WHATSAPP: "WhatsApp", INSTAGRAM: "Instagram", FACEBOOK_MESSENGER: "Messenger" };
const COLOR: Record<string, string> = {
  WHATSAPP: "var(--chart-3)",
  INSTAGRAM: "var(--chart-4)",
  FACEBOOK_MESSENGER: "var(--chart-2)",
  LEADS: "var(--primary)",
};

/** Last 4 digits only: the feed shows on screen-shares and demo videos */
const maskPhone = (phone?: string) => (phone ? `••${phone.replace(/\D/g, "").slice(-4)}` : "");
const firstName = (name?: string) => (name ? name.trim().split(/\s+/)[0] : "");

const LEAD_SOURCE: Record<string, string> = {
  FACEBOOK_LEAD_AD: "Meta ad",
  INSTAGRAM_LEAD_AD: "Meta ad",
  WHATSAPP_LEAD_AD: "Meta ad",
  WEBSITE: "Website",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  MANUAL: "added by hand",
  IMPORT: "import",
  WEB_SCRAPE: "lead finder",
};

/**
 * Message City live feed. Each new message launches a vehicle and a feed line straight
 * away and bumps the count in the cache; a debounced refetch then settles the numbers
 * (role scoping, delivered/read and reply times come from the server).
 */
export function useMessageCitySocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);
    const { pushPacket: push, pushEvent } = useCityStore.getState();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const settle = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: analyticsKeys.liveChannels() });
        queryClient.invalidateQueries({ queryKey: analyticsKeys.liveLeads() });
        queryClient.invalidateQueries({ queryKey: analyticsKeys.cityInsights() });
        queryClient.invalidateQueries({ queryKey: analyticsKeys.liveWaiting() });
      }, 2500);
    };

    const bump = (channel: LiveChannelKey, direction: "in" | "out") => {
      push(channel, direction);
      queryClient.setQueryData<LiveChannelStatsResponse>(analyticsKeys.liveChannels(), (old) =>
        old
          ? {
              ...old,
              channels: old.channels.map((c) =>
                c.key === channel
                  ? {
                      ...c,
                      inbound: c.inbound + (direction === "in" ? 1 : 0),
                      outbound: c.outbound + (direction === "out" ? 1 : 0),
                      lastMessageAt: new Date().toISOString(),
                    }
                  : c,
              ),
            }
          : old,
      );
      settle();
    };

    const asChannel = (type: string | undefined): LiveChannelKey | null =>
      type && (CITY_CHANNEL_KEYS as string[]).includes(type) ? (type as LiveChannelKey) : null;

    const onWaReceived = (p: { contactPhone?: string }) => {
      bump("WHATSAPP", "in");
      pushEvent(`New WhatsApp message ${maskPhone(p?.contactPhone)}`.trim(), COLOR.WHATSAPP);
    };
    const onWaQueued = () => {
      bump("WHATSAPP", "out");
      pushEvent("Reply sent on WhatsApp", COLOR.WHATSAPP);
    };
    const onChannelReceived = (p: WsChannelMessagePayload) => {
      const key = asChannel(p.channelType);
      if (!key) return;
      bump(key, "in");
      const who = firstName(p.senderName);
      pushEvent(`New ${LABEL[key]} message${who ? ` from ${who}` : ""}`, COLOR[key]);
    };
    const onChannelSent = (p: WsChannelMessagePayload) => {
      const key = asChannel(p.channelType);
      if (!key) return;
      bump(key, "out");
      pushEvent(`Reply sent on ${LABEL[key]}`, COLOR[key]);
    };
    // A new lead (Meta ad, website, manual…): a truck drives a parcel to the dock
    const onLead = (p: { source?: string }) => {
      push("LEADS", "in");
      const from = p?.source ? LEAD_SOURCE[p.source] : undefined;
      pushEvent(`New lead${from ? ` · ${from}` : ""}`, COLOR.LEADS);
      settle();
    };

    socket.on("whatsapp:message:received", onWaReceived);
    socket.on("whatsapp:message:queued", onWaQueued);
    socket.on("whatsapp:message:status", settle);
    socket.on("conversation:updated", settle);
    socket.on("channel:message:received", onChannelReceived);
    socket.on("channel:message:sent", onChannelSent);
    socket.on("channel:message:delivered", settle);
    socket.on("channel:message:read", settle);
    socket.on("channel:message:failed", settle);
    socket.on("contact:created", onLead);

    return () => {
      if (timer) clearTimeout(timer);
      socket.off("whatsapp:message:received", onWaReceived);
      socket.off("whatsapp:message:queued", onWaQueued);
      socket.off("whatsapp:message:status", settle);
      socket.off("conversation:updated", settle);
      socket.off("channel:message:received", onChannelReceived);
      socket.off("channel:message:sent", onChannelSent);
      socket.off("channel:message:delivered", settle);
      socket.off("channel:message:read", settle);
      socket.off("channel:message:failed", settle);
      socket.off("contact:created", onLead);
    };
  }, [accessToken, queryClient]);
}
