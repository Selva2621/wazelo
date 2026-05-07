"use client";

import { create } from "zustand";
import type { WhatsAppSession } from "@/lib/api/whatsapp";

type SessionStatus = "loading" | "no_session" | "connecting" | "connected" | "disconnected" | "reconnecting";

interface WhatsAppState {
  session: WhatsAppSession | null;
  status: SessionStatus;
  qrCode: string | null;
  qrExpiresAt: number | null;
  error: string | null;

  setSession: (session: WhatsAppSession | null) => void;
  setStatus: (status: SessionStatus) => void;
  setQr: (qr: string, expiresAt: number) => void;
  clearQr: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  session: null,
  status: "loading" as SessionStatus,
  qrCode: null,
  qrExpiresAt: null,
  error: null,
};

export const useWhatsAppStore = create<WhatsAppState>()((set) => ({
  ...initialState,

  setSession: (session) => {
    let status: SessionStatus = "no_session";
    if (session) {
      const s = session.status.toLowerCase();
      if (s === "connected" || s === "disconnected" || s === "reconnecting" || s === "connecting") {
        status = s;
      } else {
        status = "connecting";
      }
    }
    set({ session, status, error: null });
  },

  setStatus: (status) => set({ status }),

  setQr: (qrCode, qrExpiresAt) =>
    set({ qrCode, qrExpiresAt, status: "connecting" }),

  clearQr: () => set({ qrCode: null, qrExpiresAt: null }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
