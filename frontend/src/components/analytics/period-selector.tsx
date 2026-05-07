"use client";

import { Tabs } from "@/components/ui/tabs";
import type { AnalyticsPeriod } from "@/lib/types/analytics";

const PERIOD_TABS = [
  { id: "day", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
];

interface PeriodSelectorProps {
  value: AnalyticsPeriod;
  onChange: (period: AnalyticsPeriod) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <Tabs
      tabs={PERIOD_TABS}
      activeTab={value}
      onTabChange={(id) => onChange(id as AnalyticsPeriod)}
    />
  );
}
