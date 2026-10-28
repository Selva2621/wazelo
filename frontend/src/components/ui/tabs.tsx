"use client";

import { useId } from "react";
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
}

/** Pill tabs. The highlight slides from the old tab to the new one (shared layoutId). */
export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  const pillId = useId();
  const reduceMotion = useReducedMotion();

  return (
    // mobile-scroll-x (globals.css, phones/tablets only): one row that scrolls sideways
    // Pill chips: the active one is filled with the text colour (dark on light pages), and
    // that fill glides to the chip you pick
    <div className={cn("flex gap-1.5 mobile-scroll-x", className)}>
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            aria-pressed={active}
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
