"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortOrder = "asc" | "desc";

export interface ListSort {
  field: string;
  order: SortOrder;
}

/** Every super admin list's default ordering (matches the server default). */
export const NEWEST_FIRST: ListSort = { field: "createdAt", order: "desc" };

/** Clicking the active column flips the direction; another column starts at `firstOrder`. */
export function nextSort(current: ListSort, field: string, firstOrder: SortOrder = "desc"): ListSort {
  if (current.field === field) return { field, order: current.order === "asc" ? "desc" : "asc" };
  return { field, order: firstOrder };
}

interface SortableThProps {
  label: string;
  /** Server-side sort field (must be on that list's whitelist) */
  field: string;
  sort: ListSort;
  onSort: (next: ListSort) => void;
  /** Direction on first click: "asc" suits text, "desc" dates and amounts */
  firstOrder?: SortOrder;
  className?: string;
}

/** A column header that sorts the list: aria-sort on the cell, a button inside, an arrow for the direction. */
export function SortableTh({ label, field, sort, onSort, firstOrder = "desc", className }: SortableThProps) {
  const active = sort.field === field;
  const Icon = !active ? ArrowUpDown : sort.order === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.order === "asc" ? "ascending" : "descending") : "none"}
      className={cn("h-10 px-4 text-left text-label text-on-surface-variant font-medium whitespace-nowrap", className)}
    >
      <button
        type="button"
        onClick={() => onSort(nextSort(sort, field, firstOrder))}
        className={cn(
          "-mx-1 inline-flex items-center gap-1 rounded px-1 transition-colors hover:text-on-surface",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
          active && "text-on-surface",
        )}
      >
        {label}
        <Icon className={cn("h-4 w-4", !active && "opacity-40")} strokeWidth={1.75} aria-hidden />
      </button>
    </th>
  );
}
