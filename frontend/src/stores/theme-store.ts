"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "midnight-ember" | "emerald-night";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "midnight-ember",
      setTheme: (theme) => {
        document.documentElement.setAttribute("data-theme", theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next =
          get().theme === "midnight-ember" ? "emerald-night" : "midnight-ember";
        document.documentElement.setAttribute("data-theme", next);
        set({ theme: next });
      },
    }),
    {
      name: "crm-theme",
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          document.documentElement.setAttribute("data-theme", state.theme);
        }
      },
    },
  ),
);
