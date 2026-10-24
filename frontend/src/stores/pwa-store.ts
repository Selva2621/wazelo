"use client";

import { create } from "zustand";

/** Chrome/Android's install event (not in the TS DOM lib yet). */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaState {
  /** Saved install event, so our own button can open the browser's install dialog */
  installEvent: BeforeInstallPromptEvent | null;
  /** Running as the installed app (home screen / standalone window) */
  standalone: boolean;
  online: boolean;
  /** A new version is downloaded and waiting */
  waitingWorker: ServiceWorker | null;

  setInstallEvent: (e: BeforeInstallPromptEvent | null) => void;
  setStandalone: (v: boolean) => void;
  setOnline: (v: boolean) => void;
  setWaitingWorker: (w: ServiceWorker | null) => void;
}

export const usePwaStore = create<PwaState>()((set) => ({
  installEvent: null,
  standalone: false,
  online: true,
  waitingWorker: null,

  setInstallEvent: (installEvent) => set({ installEvent }),
  setStandalone: (standalone) => set({ standalone }),
  setOnline: (online) => set({ online }),
  setWaitingWorker: (waitingWorker) => set({ waitingWorker }),
}));
