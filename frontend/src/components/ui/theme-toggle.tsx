"use client";

import { Sun, Moon, Leaf, Sparkles } from "lucide-react";
import { useThemeStore, THEMES, type Theme } from "@/stores/theme-store";
import { cn } from "@/lib/utils";

const ICONS: Record<Theme, typeof Sun> = {
  daylight: Sun,
  "midnight-ember": Moon,
  "emerald-night": Leaf,
  "ember-glass": Sparkles,
};

/** Single icon button that cycles through the themes. For chrome where a full picker is too loud. */
export function ThemeCycleButton({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const index = THEMES.findIndex((t) => t.id === theme);
  const next = THEMES[(index + 1) % THEMES.length];
  const Icon = ICONS[theme];

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Theme: ${THEMES[index]?.label}. Switch to ${next.label}`}
      title={`Switch to ${next.label}`}
      className={cn(
        "grid size-9 place-items-center rounded-lg text-on-surface-variant transition-colors duration-120 ease-standard",
        "hover:bg-surface-container-low hover:text-on-surface",
        "outline-none focus-visible:ring-2 focus-visible:ring-focus",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/** Segmented theme picker (radio group). */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn("grid grid-cols-2 gap-1 rounded-lg bg-surface-container-low p-1", className)}
    >
      {THEMES.map(({ id, label }) => {
        const Icon = ICONS[id];
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(id)}
            className={cn(
              "flex h-8 items-center justify-center gap-1.5 rounded-md text-label transition-colors duration-120 ease-standard",
              "outline-none focus-visible:ring-2 focus-visible:ring-focus",
              active
                ? "bg-surface-container-lowest text-on-surface shadow-sm"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", active && "text-primary-container")} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
