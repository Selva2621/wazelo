import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Categorical icon tints (decorative, not status). Kept in one place so tiles stay consistent. */
const TINTS = {
  primary: "bg-primary/15 text-primary-container",
  blue: "bg-chart-2/15 text-chart-2",
  green: "bg-chart-3/15 text-chart-3",
  pink: "bg-chart-4/15 text-chart-4",
  violet: "bg-chart-5/15 text-chart-5",
  red: "bg-error/15 text-error",
} as const;

export type StatTint = keyof typeof TINTS;

interface StatTileProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tint?: StatTint;
  /** Secondary line under the value (rate, breakdown). */
  detail?: string | null;
  detailTone?: "muted" | "success" | "error";
  /** `card` sits on the page; `inset` sits inside another card. */
  variant?: "card" | "inset";
}

const DETAIL_TONE = {
  muted: "text-on-surface-variant",
  success: "text-success",
  error: "text-error",
};

export function StatTile({
  label,
  value,
  icon: Icon,
  tint = "primary",
  detail,
  detailTone = "muted",
  variant = "card",
}: StatTileProps) {
  return (
    <div
      className={cn(
        variant === "card" ? "rounded-xl bg-surface-container-lowest p-5" : "rounded-lg bg-surface-container-low p-4",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-label text-on-surface-variant">{label}</p>
          <p
            className={cn(
              "mt-1 font-semibold tabular-nums text-on-surface",
              variant === "card" ? "text-display" : "text-title",
            )}
          >
            {value}
          </p>
        </div>
        <span
          className={cn(
            "grid shrink-0 place-items-center rounded-full",
            variant === "card" ? "size-10" : "size-8",
            TINTS[tint],
          )}
        >
          <Icon className={variant === "card" ? "size-5" : "size-4"} />
        </span>
      </div>
      {detail && (
        <p className={cn("mt-2 truncate text-label tabular-nums", DETAIL_TONE[detailTone])}>{detail}</p>
      )}
    </div>
  );
}
