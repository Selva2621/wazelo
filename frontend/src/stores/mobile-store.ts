"use client";

import { create } from "zustand";

interface MobileState {
  /** Pages visited in this session, newest last (for iOS-style Back) */
  history: string[];
  /** Screens that cover the tab bar (open chat, editors); a count so nested users don't clash */
  tabBarHiders: number;
  /** Path that was current when the page set its title (stale titles are ignored) */
  titlePath: string | null;
  /** Page-provided title override for the mobile bar (e.g. a contact's name) */
  titleOverride: { path: string; title: string } | null;
  /** The nav bar's right-hand slot that pages portal their buttons into */
  actionsSlot: HTMLElement | null;

  visit: (path: string) => void;
  setActionsSlot: (el: HTMLElement | null) => void;
  hideTabBar: () => () => void;
  setTitlePath: (path: string) => void;
  setTitleOverride: (value: { path: string; title: string } | null) => void;
}

const MAX_HISTORY = 50;

export const useMobileStore = create<MobileState>()((set) => ({
  history: [],
  tabBarHiders: 0,
  titlePath: null,
  titleOverride: null,
  actionsSlot: null,

  setActionsSlot: (actionsSlot) => set({ actionsSlot }),
  visit: (path) =>
    set((s) => {
      const h = s.history;
      if (h[h.length - 1] === path) return s;
      // Going back to the previous page: pop instead of push
      if (h[h.length - 2] === path) return { history: h.slice(0, -1) };
      return { history: [...h, path].slice(-MAX_HISTORY) };
    }),

  hideTabBar: () => {
    set((s) => ({ tabBarHiders: s.tabBarHiders + 1 }));
    return () => set((s) => ({ tabBarHiders: Math.max(0, s.tabBarHiders - 1) }));
  },

  setTitlePath: (titlePath) => set({ titlePath }),
  setTitleOverride: (titleOverride) => set({ titleOverride }),
}));
