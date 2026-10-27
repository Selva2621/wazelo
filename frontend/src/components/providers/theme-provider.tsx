"use client";

import { useEffect, type ReactNode } from "react";
import { useThemeStore, THEMES } from "@/stores/theme-store";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  // Set theme on mount and whenever it changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Inline script to prevent FOUC — sets theme before first paint
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          // Only known themes: an unknown saved value would leave the page with no theme
          __html: `try{var k=${JSON.stringify(THEMES.map((t) => t.id))},t=JSON.parse(localStorage.getItem("crm-theme")||"{}"),v=t&&t.state&&t.state.theme;document.documentElement.setAttribute("data-theme",k.indexOf(v)>-1?v:"daylight")}catch(e){}`,
        }}
      />
      {children}
    </>
  );
}
