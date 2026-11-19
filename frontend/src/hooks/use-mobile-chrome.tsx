"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useMobileStore } from "@/stores/mobile-store";
import type { ConversationListResponse } from "@/lib/types/inbox";

/**
 * Hooks for pages to talk to the iOS-style mobile shell (no effect on desktop,
 * where the mobile bars are hidden).
 */

/** Hide the bottom tab bar while `active` (an open chat, a full-screen editor). */
export function useHideTabBar(active = true) {
  const hideTabBar = useMobileStore((s) => s.hideTabBar);
  useEffect(() => {
    if (!active) return;
    return hideTabBar();
  }, [active, hideTabBar]);
}

/** Show a specific title in the mobile bar for this page (e.g. the contact's name). */
export function useMobileTitle(title: string | undefined | null) {
  const pathname = usePathname();
  const setTitleOverride = useMobileStore((s) => s.setTitleOverride);
  useEffect(() => {
    if (!title) return;
    setTitleOverride({ path: pathname, title });
    return () => setTitleOverride(null);
  }, [title, pathname, setTitleOverride]);
}

/** Puts buttons in the top-right of the mobile nav bar. Renders nothing on desktop. */
export function MobileNavActions({ children }: { children: ReactNode }) {
  const target = useMobileStore((s) => s.actionsSlot);
  return target ? createPortal(children, target) : null;
}

/**
 * Conversations with unread messages, from the inbox list already in the cache
 * (kept live by the inbox socket). 0 until the inbox has loaded once.
 */
export function useInboxUnreadCount() {
  const queryClient = useQueryClient();
  return useSyncExternalStore(
    (onChange) => queryClient.getQueryCache().subscribe(onChange),
    () => {
      const queries = queryClient.getQueryCache().findAll({ queryKey: ["conversations", "list"] });
      let latest: ConversationListResponse | undefined;
      let latestAt = -1;
      for (const q of queries) {
        if (q.state.dataUpdatedAt > latestAt && q.state.data) {
          latestAt = q.state.dataUpdatedAt;
          latest = q.state.data as ConversationListResponse;
        }
      }
      return latest?.data?.filter((c) => c.unreadCount > 0 && c.status === "OPEN").length ?? 0;
    },
    () => 0,
  );
}
