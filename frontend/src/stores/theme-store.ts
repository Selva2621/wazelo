"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "midnight-ember" | "emerald-night" | "daylight" | "ember-glass";

export const THEMES: { id: Theme; label: string; mode: "light" | "dark" }[] = [
  { id: "daylight", label: "Light", mode: "light" },
  { id: "midnight-ember", label: "Dark", mode: "dark" },
  { id: "emerald-night", label: "Emerald", mode: "dark" },
  { id: "ember-glass", label: "Glass", mode: "dark" },
];

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/** First visit is always light; an explicit choice is persisted after that. */
function initialTheme(): Theme {
  return "daylight";
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: initialTheme(),
      setTheme: (theme) => {
        document.documentElement.setAttribute("data-theme", theme);
        set({ theme });
      },
      toggleTheme: () => {
        // Cycle through the available themes in menu order
        const order = THEMES.map((t) => t.id);
        const next = order[(order.indexOf(get().theme) + 1) % order.length];
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
