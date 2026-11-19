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
  /** `origin`: the control that was clicked; the new theme spreads from its centre. */
  setTheme: (theme: Theme, origin?: Element | null) => void;
  toggleTheme: (origin?: Element | null) => void;
}

/**
 * Switch the theme with a circular reveal from `origin` (View Transitions API). Falls back
 * to an instant switch when the API is missing or reduced motion is on.
 */
function applyTheme(theme: Theme, origin: Element | null | undefined, commit: () => void) {
  const root = document.documentElement;
  const run = () => {
    root.setAttribute("data-theme", theme);
    commit();
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduceMotion || root.getAttribute("data-theme") === theme) {
    run();
    return;
  }
  const rect = origin?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 40;
  const y = rect ? rect.top + rect.height / 2 : 40;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  document
    .startViewTransition(run)
    .ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 450, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {});
}

/** First visit is always light; an explicit choice is persisted after that. */
function initialTheme(): Theme {
  return "daylight";
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: initialTheme(),
      setTheme: (theme, origin) => {
        applyTheme(theme, origin, () => set({ theme }));
      },
      toggleTheme: (origin) => {
        // Cycle through the available themes in menu order
        const order = THEMES.map((t) => t.id);
        const next = order[(order.indexOf(get().theme) + 1) % order.length];
        applyTheme(next, origin, () => set({ theme: next }));
      },
    }),
    {
      name: "crm-theme",
      // v2: a short-lived build saved v1 data, possibly with a theme that no longer exists.
      // Keep any saved theme that is still valid; anything else falls back to the default.
      version: 2,
      migrate: (persisted) => {
        const saved = (persisted as Partial<ThemeState> | null)?.theme;
        const valid = THEMES.some((t) => t.id === saved);
        return { theme: valid ? saved : initialTheme() } as ThemeState;
      },
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          document.documentElement.setAttribute("data-theme", state.theme);
        }
      },
    },
  ),
);
