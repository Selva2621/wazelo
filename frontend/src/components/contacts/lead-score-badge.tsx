"use client";

import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface LeadScoreBadgeProps {
  score: number;
  size?: "sm" | "md";
}

function getScoreColor(score: number) {
  if (score >= 75) return { bg: "bg-success/15", text: "text-success", ring: "ring-success/30", label: "Hot" };
  if (score >= 50) return { bg: "bg-warning/15", text: "text-warning", ring: "ring-warning/30", label: "Warm" };
  if (score >= 25) return { bg: "bg-info/15", text: "text-info", ring: "ring-info/30", label: "Cool" };
  return { bg: "bg-on-surface-variant/10", text: "text-on-surface-variant", ring: "ring-outline-variant/20", label: "Cold" };
}

export function LeadScoreBadge({ score, size = "sm" }: LeadScoreBadgeProps) {
  const { bg, text, ring, label } = getScoreColor(score);

  if (size === "md") {
    return (
      <div className={cn("flex items-center gap-2 rounded-xl px-3 py-1.5 ring-1", bg, ring)}>
        <TrendingUp className={cn("h-4 w-4", text)} />
        <div>
          <span className={cn("text-[15px] font-bold", text)}>{score}</span>
          <span className={cn("text-[11px] ml-1", text)}>/100</span>
        </div>
        <span className={cn("text-[11px] font-medium uppercase tracking-wide", text)}>{label}</span>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1",
        bg,
        text,
        ring,
      )}
    >
      <TrendingUp className="h-3 w-3" />
      {score}
    </span>
  );
}
