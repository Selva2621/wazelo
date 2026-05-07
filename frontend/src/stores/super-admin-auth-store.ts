"use client";

import { create } from "zustand";

interface SuperAdminInfo {
  id: string;
  name: string;
  email: string;
}

interface SuperAdminAuthState {
  superAdmin: SuperAdminInfo | null;
  accessToken: string | null;
  setAuth: (superAdmin: SuperAdminInfo, accessToken: string) => void;
  clearAuth: () => void;
}

function setCookie(name: string, value: string, days = 1) {
  if (typeof document === "undefined") return;
  if (!value || value === "undefined" || value === "null") return;
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`;
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match) return null;
  const value = decodeURIComponent(match[1]);
  // Guard against stale "undefined"/"null" string values from previous broken sessions
  if (!value || value === "undefined" || value === "null") return null;
  return value;
}

export const useSuperAdminAuthStore = create<SuperAdminAuthState>()((set) => ({
  superAdmin: null,
  accessToken: null,
  setAuth: (superAdmin, accessToken) => {
    // Sync to cookie so it survives page refresh / cross-tab
    setCookie("sa_token", accessToken, 1);
    setCookie("hasSuperAdminSession", "1", 1);
    set({ superAdmin, accessToken });
  },
  clearAuth: () => {
    deleteCookie("sa_token");
    deleteCookie("hasSuperAdminSession");
    set({ superAdmin: null, accessToken: null });
  },
}));

// Cookie is synchronously readable; store initializes from null on page refresh
export function getSuperAdminToken(): string | null {
  const fromCookie = getCookie("sa_token");
  if (fromCookie) return fromCookie;
  return useSuperAdminAuthStore.getState().accessToken;
}
