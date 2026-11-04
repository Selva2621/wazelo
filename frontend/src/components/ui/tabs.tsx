"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
  /**
   * Set when the tabs switch panels: renders a real tablist (arrow keys, aria-selected).
   * Tab ids become `${idBase}-tab-${id}` and each controls `${idBase}-panel-${id}`.
   */
  idBase?: string;
  /** Accessible name of the tablist (with idBase). */
  label?: string;
  /**
   * pill (default): filter chips. underline: page-level tabs that switch what the page
   * lists, so they read differently from the filters under them.
   */
  variant?: "pill" | "underline";
}

/** Ids for the tabpanel that a Tabs button controls (use with idBase). */
export function tabPanelProps(idBase: string, id: string) {
  return {
    id: `${idBase}-panel-${id}`,
    role: "tabpanel" as const,
    "aria-labelledby": `${idBase}-tab-${id}`,
    tabIndex: 0,
  };
}

/** Pill tabs. The highlight slides from the old tab to the new one (shared layoutId). */
export function Tabs({ tabs, activeTab, onTabChange, className, idBase, label, variant = "pill" }: TabsProps) {
  const pillId = useId();
  const reduceMotion = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);
  const isTablist = !!idBase;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isTablist) return;
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const current = tabs.findIndex((t) => t.id === activeTab);
    const last = tabs.length - 1;
    const next =
      e.key === "Home" ? 0
      : e.key === "End" ? last
      : e.key === "ArrowRight" ? (current >= last ? 0 : current + 1)
      : current <= 0 ? last : current - 1;
    onTabChange(tabs[next].id);
    listRef.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  };

  const buttonA11y = (tab: TabItem, active: boolean) =>
    isTablist
      ? {
          role: "tab",
          id: `${idBase}-tab-${tab.id}`,
          "aria-selected": active,
          "aria-controls": `${idBase}-panel-${tab.id}`,
          tabIndex: active ? 0 : -1,
        }
      : { "aria-pressed": active };

  if (variant === "underline") {
    return (
      // A line under the whole row; the active tab's thicker line glides to the tab you pick
      <div
        ref={listRef}
        className={cn("flex gap-6 border-b border-outline-variant mobile-scroll-x", className)}
        {...(isTablist && { role: "tablist", "aria-label": label, onKeyDown })}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              {...buttonA11y(tab, active)}
              className={cn(
                "relative -mb-px inline-flex h-10 items-center gap-1.5 rounded-t-md text-body font-medium transition-colors duration-180 ease-standard max-lg:min-h-11",
                "outline-none focus-visible:ring-2 focus-visible:ring-focus",
                active ? "text-on-surface" : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-caption tabular-nums",
                    active ? "bg-on-surface text-surface" : "bg-surface-container text-on-surface-variant",
                  )}
                >
                  {tab.count}
                </span>
              )}
              {active && (
                <motion.span
                  layoutId={`tabs-line-${pillId}`}
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-on-surface"
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    // mobile-scroll-x (globals.css, phones/tablets only): one row that scrolls sideways
    // Pill chips: the active one is filled with the text colour (dark on light pages), and
    // that fill glides to the chip you pick
    <div
      ref={listRef}
      className={cn("flex gap-1.5 mobile-scroll-x", className)}
      {...(isTablist && { role: "tablist", "aria-label": label, onKeyDown })}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            {...buttonA11y(tab, active)}
            className={cn(
              "relative inline-flex h-8 items-center rounded-full border px-3 text-label font-medium transition-colors duration-180 ease-standard",
              "outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
              active
                ? "border-transparent text-surface"
                : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline hover:text-on-surface",
            )}
          >
            {active && (
              <motion.span
                layoutId={`tabs-pill-${pillId}`}
                aria-hidden
                className="absolute -inset-px rounded-full bg-on-surface"
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
              />
            )}
            <span className="relative">
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn("ml-1.5 tabular-nums", active ? "text-surface/70" : "text-on-surface-variant/70")}>
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
