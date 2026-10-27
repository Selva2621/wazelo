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
    <div className={cn("flex gap-1 mobile-scroll-x", className)}>
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            aria-pressed={active}
            className={cn(
              "relative px-3 py-2 text-body font-medium rounded-lg transition-colors duration-180 ease-standard",
              "outline-none focus-visible:ring-2 focus-visible:ring-focus",
              active
                ? "text-primary"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container",
            )}
          >
            {active && (
              <motion.span
                layoutId={`tabs-pill-${pillId}`}
                aria-hidden
                className="absolute inset-0 rounded-lg bg-primary/10"
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
              />
            )}
            <span className="relative">
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn("ml-1.5 text-caption", active ? "text-primary/70" : "text-on-surface-variant/60")}>
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
