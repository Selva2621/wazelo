"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { EllipsisVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Phones (below lg): a board shows one stage at a time. A row of stage tabs sits in the
 * page's fixed header; below it only the selected stage's list scrolls. Every row opens
 * the same details view as its desktop card, and a ⋮ button holds its other actions
 * ("Move to …" replaces dragging). Desktop never renders any of this.
 */

export interface StageTab {
  id: string;
  label: string;
  /** Shown after the label; null/undefined hides it (e.g. still loading) */
  count?: number | null;
  color?: string;
}

/** Id of the tab and of the panel it controls, for aria wiring */
export const stageTabId = (idBase: string, id: string) => `${idBase}-tab-${id}`;
export const stagePanelId = (idBase: string) => `${idBase}-panel`;

/** Phone-only row of stage tabs (colour dot, name, count). Scrolls sideways. */
export function StageTabs({
  tabs,
  value,
  onChange,
  label,
  idBase,
  className,
}: {
  tabs: StageTab[];
  value: string;
  onChange: (id: string) => void;
  /** Accessible name of the tab list, e.g. "Stages" */
  label: string;
  idBase: string;
  className?: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === value),
  );

  // Keep the selected tab in view
  useEffect(() => {
    const row = rowRef.current;
    const tab = row?.children[activeIndex] as HTMLElement | undefined;
    if (!row || !tab || row.scrollWidth <= row.clientWidth) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollTo({
      left: tab.offsetLeft - (row.clientWidth - tab.offsetWidth) / 2,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [activeIndex]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = tabs.length - 1;
    const next =
      e.key === "ArrowRight" ? (activeIndex >= last ? 0 : activeIndex + 1)
      : e.key === "ArrowLeft" ? (activeIndex <= 0 ? last : activeIndex - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].id);
    rowRef.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  };

  return (
    <div
      ref={rowRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "mobile-scroll-x relative flex w-full min-w-0 gap-1 border-b border-outline-variant px-4 lg:hidden",
        className,
      )}
    >
      {tabs.map((tab, i) => {
        const selected = i === activeIndex;
        return (
          <button
            key={tab.id}
            id={stageTabId(idBase, tab.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={stagePanelId(idBase)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative inline-flex h-11 items-center gap-1.5 px-2.5 text-label font-medium transition-colors",
              "outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-focus",
              selected ? "text-on-surface" : "text-on-surface-variant active:text-on-surface",
            )}
          >
            {tab.color && (
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: tab.color }} />
            )}
            {tab.label}
            {tab.count != null && (
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 text-center text-caption tabular-nums",
                  selected ? "bg-on-surface text-surface" : "bg-surface-container text-on-surface-variant",
                )}
              >
                {tab.count}
              </span>
            )}
            {/* Selected marker */}
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-colors",
                selected ? "bg-on-surface" : "bg-transparent",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

/** Phone-only scrolling list area for the selected stage (the only part that scrolls). */
export function StagePanel({
  idBase,
  tabId,
  children,
  className,
}: {
  idBase: string;
  tabId: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      id={stagePanelId(idBase)}
      role="tabpanel"
      aria-labelledby={stageTabId(idBase, tabId)}
      className={cn("min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain lg:hidden", className)}
    >
      {children}
    </div>
  );
}

/** One compact list row: tap opens the item, ⋮ opens its actions. */
export function StageRow({
  leading,
  title,
  subtitle,
  trailing,
  meta,
  onOpen,
  onMenu,
  menuLabel,
  busy,
}: {
  leading: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned text on the title line (e.g. a value) */
  trailing?: ReactNode;
  /** Small chips under the subtitle */
  meta?: ReactNode;
  onOpen: () => void;
  onMenu: () => void;
  /** Accessible name of the ⋮ button, e.g. "Actions for Priya" */
  menuLabel: string;
  busy?: boolean;
}) {
  return (
    <li className="flex min-w-0 items-center border-b border-outline-variant last:border-b-0">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-2.5 pl-4 text-left outline-none active:bg-surface-container focus-visible:bg-surface-container"
      >
        {leading}
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-body font-medium text-on-surface">{title}</span>
            {trailing && (
              <span className="shrink-0 text-label font-medium tabular-nums text-on-surface">{trailing}</span>
            )}
          </span>
          {subtitle && <span className="block truncate text-label text-on-surface-variant">{subtitle}</span>}
          {meta && <span className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">{meta}</span>}
        </span>
      </button>
      <button
        type="button"
        onClick={onMenu}
        disabled={busy}
        aria-label={menuLabel}
        className="grid size-11 shrink-0 place-items-center rounded-full text-on-surface-variant outline-none active:bg-surface-container focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50 mr-1"
      >
        <EllipsisVertical aria-hidden className="h-5 w-5" />
      </button>
    </li>
  );
}

/** Small grey chip for a row's meta line */
export function StageChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center truncate rounded-full bg-surface-container px-2 py-0.5 text-caption text-on-surface-variant",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Centered note for an empty, loading or failed stage */
export function StageNote({ children, role }: { children: ReactNode; role?: "alert" | "status" }) {
  return (
    <div role={role} className="flex flex-col items-center justify-center px-6 py-12 text-center text-label text-on-surface-variant">
      {children}
    </div>
  );
}
