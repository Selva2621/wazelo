"use client";

import { useEffect, type ReactNode } from "react";
import { useThemeStore } from "@/stores/theme-store";

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
          __html: `try{var t=JSON.parse(localStorage.getItem("crm-theme")||"{}");if(t&&t.state&&t.state.theme)document.documentElement.setAttribute("data-theme",t.state.theme)}catch(e){}`,
        }}
      />
      {children}
    </>
  );
}
