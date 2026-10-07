"use client";

import { create } from "zustand";

export interface SuperAdminInfo {
  id: string;
  name: string;
  email: string;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
}

interface SuperAdminAuthState {
  superAdmin: SuperAdminInfo | null;
  /** Kept in memory only — the refresh token lives in an HttpOnly cookie. */
  accessToken: string | null;
  setAuth: (superAdmin: SuperAdminInfo, accessToken: string) => void;
  setProfile: (superAdmin: SuperAdminInfo) => void;
  clearAuth: () => void;
}

/**
 * Non-sensitive marker read by proxy.ts to route between login and the portal.
 * It grants nothing: every API call still needs a valid access token.
 */
const SESSION_MARKER = "hasSuperAdminSession";

function setMarkerCookie() {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + 86400000).toUTCString(); // matches the 1d refresh token
  document.cookie = `${SESSION_MARKER}=1; expires=${expires}; path=/; SameSite=Strict`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`;
}

// Remove the JS-readable access token cookie left by older builds
deleteCookie("sa_token");

export const useSuperAdminAuthStore = create<SuperAdminAuthState>()((set) => ({
  superAdmin: null,
  accessToken: null,
  setAuth: (superAdmin, accessToken) => {
    setMarkerCookie();
    set({ superAdmin, accessToken });
  },
  setProfile: (superAdmin) => set({ superAdmin }),
  clearAuth: () => {
    deleteCookie(SESSION_MARKER);
    set({ superAdmin: null, accessToken: null });
  },
}));

export function getSuperAdminToken(): string | null {
  return useSuperAdminAuthStore.getState().accessToken;
}
