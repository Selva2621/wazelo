"use client";

import { create } from "zustand";
import type { AuthUser } from "@/lib/types/auth";
import { disconnectSocket } from "@/lib/socket";

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  expiresAt: number | null;
  isAuthenticated: boolean;

  setAuth: (data: {
    accessToken: string;
    expiresIn: number;
    user: AuthUser;
    rememberMe?: boolean;
  }) => void;
  setTokens: (data: {
    accessToken: string;
    expiresIn: number;
    user?: AuthUser;
  }) => void;
  clearAuth: () => void;
}

// `hasSession` is a hint for the route proxy (src/proxy.ts), not a credential. It mirrors
// the httpOnly refresh cookie's lifetime (backend: 30 days with "Remember me", else 1 day)
// so a remembered user isn't bounced to /auth/login after a browser restart.
// Value "r" = remembered, "1" = standard; each refresh slides the expiry like the backend.
const DAY = 24 * 60 * 60;

function readSessionCookie(): string | undefined {
  return document.cookie.match(/(?:^|;\s*)hasSession=([^;]*)/)?.[1] || undefined;
}

function setSessionCookie(session: { remember: boolean } | null) {
  if (typeof document === "undefined") return;
  if (session) {
    const value = session.remember ? "r" : "1";
    const maxAge = session.remember ? 30 * DAY : DAY;
    document.cookie = `hasSession=${value}; path=/; max-age=${maxAge}; SameSite=Strict`;
  } else {
    document.cookie = "hasSession=; path=/; max-age=0; SameSite=Strict";
  }
}

/** Keeps the remembered flag from the login that started this session. */
function slideSessionCookie() {
  if (typeof document === "undefined") return;
  setSessionCookie({ remember: readSessionCookie() === "r" });
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  user: null,
  expiresAt: null,
  isAuthenticated: false,

  setAuth: ({ accessToken, expiresIn, user, rememberMe = false }) => {
    setSessionCookie({ remember: rememberMe });
    set({
      accessToken,
      user,
      expiresAt: Date.now() + expiresIn * 1000,
      isAuthenticated: true,
    });
  },

  setTokens: ({ accessToken, expiresIn, user }) => {
    slideSessionCookie();
    set((state) => ({
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
      isAuthenticated: true,
      user: user ?? state.user,
    }));
  },

  clearAuth: () => {
    resetLocalAuth();
    // Other open tabs hold their own in-memory access token; tell them to sign out too.
    authChannel?.postMessage("logout");
  },
}));

/** Drops this tab's session state without notifying other tabs. */
function resetLocalAuth() {
  setSessionCookie(null);
  // The realtime socket was authenticated as this user; don't keep receiving their org's events.
  disconnectSocket();
  useAuthStore.setState({
    accessToken: null,
    user: null,
    expiresAt: null,
    isAuthenticated: false,
  });
}

// Cross-tab logout. ProtectedLayout reacts to isAuthenticated=false in each tab (clears the
// query cache and redirects to /auth/login).
const authChannel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("wazelo-auth")
    : null;

authChannel?.addEventListener("message", (event) => {
  if (event.data === "logout" && useAuthStore.getState().isAuthenticated) {
    resetLocalAuth();
  }
});
