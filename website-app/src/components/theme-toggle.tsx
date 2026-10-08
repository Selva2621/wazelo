"use client";

// Light/dark switch. The theme lives on <html data-theme>, set before first
// paint by the script in layout.tsx, which follows the device theme. This
// button overrides it; the override is stored with the device mode it was made
// against, so layout.tsx drops it as soon as the device switches.

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const KEY = "wazelo-theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  // Unknown until mounted (the server can't see the visitor's choice).
  const [theme, setTheme] = useState<Theme | null>(null);

  // Follow <html data-theme>, so every toggle on the page (navbar, footer dock)
  // shows the same icon whichever one was clicked.
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setTheme(root.dataset.theme === "dark" ? "dark" : "light");
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const sys: Theme = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      // Picking the device's own theme just means "back to automatic".
      if (next === sys) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, JSON.stringify({ theme: next, sys }));
    } catch {
      /* private mode: the choice just isn't remembered */
    }
    setTheme(next);
  };

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`grid size-10 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-ink/5 hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container ${className}`}
    >
      {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
