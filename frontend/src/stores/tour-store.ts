"use client";

import { create } from "zustand";

interface TourState {
  /** The running tour, if any */
  activeId: string | null;
  /** Started from the Tours page for another screen: runs once that screen opens */
  pendingId: string | null;
  /** Tours that already started by themselves this session (never twice) */
  autoTried: string[];

  start: (id: string) => void;
  /** Run this tour when its screen opens; null cancels */
  queue: (id: string | null) => void;
  stop: () => void;
  markAutoTried: (id: string) => void;
  /** After "Replay all": tours may start by themselves again this session */
  clearAutoTried: () => void;
}

export const useTourStore = create<TourState>()((set) => ({
  activeId: null,
  pendingId: null,
  autoTried: [],

  start: (id) => set({ activeId: id, pendingId: null }),
  queue: (id) => set({ pendingId: id }),
  stop: () => set({ activeId: null }),
  markAutoTried: (id) =>
    set((s) => (s.autoTried.includes(id) ? s : { autoTried: [...s.autoTried, id] })),
  clearAutoTried: () => set({ autoTried: [] }),
}));
