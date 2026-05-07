"use client";

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

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn("flex gap-1", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-3 py-2 text-[13px] font-medium rounded-lg transition-colors",
            activeTab === tab.id
              ? "text-primary bg-primary/10"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container",
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                "ml-1.5 text-[11px]",
                activeTab === tab.id
                  ? "text-primary/70"
                  : "text-on-surface-variant/60",
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
