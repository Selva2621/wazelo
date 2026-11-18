"use client";

import { useEffect, useState } from "react";
import { THEMES, useThemeStore } from "@/stores/theme-store";

export interface CityTheme {
  dark: boolean;
  primary: string;
  surface: string;
  ground: string;
  onSurface: string;
  outline: string;
  chart: Record<string, string>;
  /** Status colours for reply-speed lights */
  success: string;
  warning: string;
  error: string;
}

const read = (style: CSSStyleDeclaration, name: string, fallback: string) =>
  style.getPropertyValue(name).trim() || fallback;

function readTheme(dark: boolean): CityTheme {
  const s = getComputedStyle(document.documentElement);
  return {
    dark,
    primary: read(s, "--primary", "#d97706"),
    surface: read(s, "--surface", dark ? "#0f1117" : "#f4f6fa"),
    ground: read(s, "--surface-container-low", dark ? "#151821" : "#eef1f6"),
    onSurface: read(s, "--on-surface", dark ? "#e7e9ee" : "#1b1f27"),
    outline: read(s, "--outline-variant", dark ? "#2a2f3a" : "#d5dae3"),
    success: read(s, "--success", "#16a34a"),
    warning: read(s, "--warning", "#f59e0b"),
    error: read(s, "--error", "#dc2626"),
    chart: Object.fromEntries(
      [1, 2, 3, 4, 5].map((i) => [`--chart-${i}`, read(s, `--chart-${i}`, "#94a3b8")]),
    ),
  };
}

/** Design-token colours for the 3D scene; re-reads when the app theme changes. */
export function useCityTheme(): CityTheme | null {
  const themeId = useThemeStore((s) => s.theme);
  const dark = THEMES.find((t) => t.id === themeId)?.mode !== "light";
  const [theme, setTheme] = useState<CityTheme | null>(null);

  useEffect(() => {
    // The data-theme attribute flips inside a view transition: read on the next frame
    const id = requestAnimationFrame(() => setTheme(readTheme(dark)));
    return () => cancelAnimationFrame(id);
  }, [themeId, dark]);

  return theme;
}
