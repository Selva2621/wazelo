"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/*
 * Phones: a board's columns sit side by side, one screen wide, in a sideways snap
 * scroller. A row of chips above it names every column; tapping a chip scrolls to that
 * column and swiping keeps the chip in step. Desktop never renders the chips.
 */

function columnsOf(scroller: HTMLElement) {
  return Array.from(scroller.querySelectorAll<HTMLElement>("[data-swipe-column]"));
}

function snapLeft(scroller: HTMLElement) {
  const pad = parseFloat(getComputedStyle(scroller).scrollPaddingLeft) || 0;
  return scroller.getBoundingClientRect().left + pad;
}

/** Tracks which column is in view and scrolls to one on request. */
export function useSwipeColumns(count: number) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const [active, setActive] = useState(0);

  const onScroll = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const left = snapLeft(scroller);
      let best = 0;
      let bestDistance = Infinity;
      columnsOf(scroller).forEach((col, i) => {
        const distance = Math.abs(col.getBoundingClientRect().left - left);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      setActive(best);
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const scrollTo = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    const col = scroller ? columnsOf(scroller)[index] : undefined;
    if (!scroller || !col) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollTo({
      left: scroller.scrollLeft + col.getBoundingClientRect().left - snapLeft(scroller),
      behavior: reduceMotion ? "auto" : "smooth",
    });
    setActive(index);
  }, []);

  return { scrollerRef, onScroll, scrollTo, active: Math.min(active, Math.max(0, count - 1)) };
}

export interface SwipeColumnChip {
  id: string;
  label: string;
  /** Shown after the label; null/undefined hides it (e.g. still loading) */
  count?: number | null;
  color?: string;
}

/** Phone-only row of column chips (stage name + count). */
export function SwipeColumnChips({
  chips,
  active,
  onSelect,
  label,
  className,
}: {
  chips: SwipeColumnChip[];
  active: number;
  onSelect: (index: number) => void;
  /** Accessible name of the row, e.g. "Stages" */
  label: string;
  className?: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  // Keep the active chip in view as the columns are swiped
  useEffect(() => {
    const row = rowRef.current;
    const chip = row?.children[active] as HTMLElement | undefined;
    if (!row || !chip) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollTo({
      left: chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [active]);

  return (
    <div
      ref={rowRef}
      role="group"
      aria-label={label}
      className={cn("mobile-scroll-x relative flex gap-2 px-4 py-2 lg:hidden", className)}
    >
      {chips.map((chip, i) => {
        const selected = i === active;
        return (
          <button
            key={chip.id}
            type="button"
            aria-pressed={selected}
            aria-controls={`swipe-col-${chip.id}`}
            onClick={() => onSelect(i)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-label font-medium transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-focus",
              selected
                ? "bg-on-surface text-surface"
                : "bg-surface-container text-on-surface-variant active:bg-surface-container-high",
            )}
          >
            {chip.color && (
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: chip.color }} />
            )}
            {chip.label}
            {chip.count != null && (
              <span className={cn("tabular-nums", selected ? "opacity-70" : "opacity-60")}>{chip.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
