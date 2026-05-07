"use client";

import { Flame, Leaf } from "lucide-react";
import { useThemeStore } from "@/stores/theme-store";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors",
        className,
      )}
      aria-label={`Switch to ${theme === "midnight-ember" ? "Emerald Night" : "Midnight Ember"} theme`}
    >
      {theme === "midnight-ember" ? (
        <>
          <Flame className="h-4 w-4 text-primary" />
          <span>Ember</span>
        </>
      ) : (
        <>
          <Leaf className="h-4 w-4 text-primary" />
          <span>Emerald</span>
        </>
      )}
    </button>
  );
}
