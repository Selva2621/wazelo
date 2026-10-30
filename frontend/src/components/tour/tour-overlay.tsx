"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motionTokens } from "@/lib/motion-tokens";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { TourExample } from "./tour-example";
import type { TourDef, TourStep } from "@/lib/tours/types";

/** Space around the highlighted element */
const PAD = 8;
/** Gap between the highlight and the card */
const GAP = 12;
/** Card keeps this far from the viewport edges */
const EDGE = 12;
const CARD_WIDTH = 368;
/** How long to wait for a step's element (data still loading) before skipping it */
const FIND_TIMEOUT_MS = 1800;
/** Later steps: the screen has loaded by now, so a missing element won't show up */
const LATER_FIND_TIMEOUT_MS = 400;

type Rect = { top: number; left: number; width: number; height: number };

/** `data-tour` name, or a CSS selector when it has selector characters */
function toSelector(target: string) {
  return /[[#.:\s>]/.test(target) ? target : `[data-tour="${target}"]`;
}

function isVisible(el: Element) {
  if (el.closest("[inert], [aria-hidden='true']")) return false;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  const style = getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0.05;
}

/** First visible match among the step's targets, in order */
function findTarget(target: TourStep["target"]): HTMLElement | null {
  if (!target) return null;
  for (const t of Array.isArray(target) ? target : [target]) {
    let nodes: NodeListOf<HTMLElement>;
    try {
      nodes = document.querySelectorAll<HTMLElement>(toSelector(t));
    } catch {
      continue;
    }
    for (const el of nodes) if (isVisible(el)) return el;
  }
  return null;
}

function sameRect(a: Rect | null, b: Rect | null) {
  return (
    a === b ||
    (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height)
  );
}

/** Highlight box, kept inside the viewport (a tall list is cut at the screen edges) */
function spotlightRect(r: Rect, vw: number, vh: number): Rect {
  const top = Math.max(r.top - PAD, 4);
  const left = Math.max(r.left - PAD, 4);
  const bottom = Math.min(r.top + r.height + PAD, vh - 4);
  const right = Math.min(r.left + r.width + PAD, vw - 4);
  return { top, left, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) };
}

const SIDES = ["bottom", "top", "right", "left"] as const;

/** Desktop card position next to the highlight: preferred side first, then whichever fits */
function placeCard(
  spot: Rect | null,
  size: { w: number; h: number },
  vw: number,
  vh: number,
  placement?: TourStep["placement"],
): { top: number; left: number } {
  const clampX = (x: number) => Math.min(Math.max(x, EDGE), vw - size.w - EDGE);
  const clampY = (y: number) => Math.min(Math.max(y, EDGE), vh - size.h - EDGE);
  if (!spot) return { top: clampY((vh - size.h) / 2), left: clampX((vw - size.w) / 2) };

  const fits = {
    bottom: vh - (spot.top + spot.height) - GAP >= size.h + EDGE,
    top: spot.top - GAP >= size.h + EDGE,
    right: vw - (spot.left + spot.width) - GAP >= size.w + EDGE,
    left: spot.left - GAP >= size.w + EDGE,
  };
  const order = placement ? [placement, ...SIDES.filter((s) => s !== placement)] : [...SIDES];
  const side = order.find((s) => fits[s]);

  const midX = spot.left + spot.width / 2 - size.w / 2;
  const midY = spot.top + spot.height / 2 - size.h / 2;
  switch (side) {
    case "bottom":
      return { top: spot.top + spot.height + GAP, left: clampX(midX) };
    case "top":
      return { top: spot.top - GAP - size.h, left: clampX(midX) };
    case "right":
      return { top: clampY(midY), left: spot.left + spot.width + GAP };
    case "left":
      return { top: clampY(midY), left: spot.left - GAP - size.w };
    default:
      // The highlight fills the screen: sit in the bottom-right corner over it
      return { top: vh - size.h - EDGE, left: vw - size.w - EDGE };
  }
}

interface TourOverlayProps {
  tour: TourDef;
  onClose: (status: "completed" | "skipped") => void;
}

/**
 * Spotlight tour: dims the screen, cuts a hole around the step's element and shows a
 * card beside it (desktop) or docked to the top/bottom edge (mobile). Keyboard: ← → to
 * move, Esc to leave; focus stays in the card and returns where it was afterwards.
 */
export function TourOverlay({ tour, onClose }: TourOverlayProps) {
  const isMobile = useIsMobile();
  const role = useAuthStore((s) => s.user?.role);
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const bodyId = useId();

  const steps = useMemo(
    () =>
      tour.steps.filter(
        (s) =>
          (!s.only || s.only === (isMobile ? "mobile" : "desktop")) &&
          (!s.roles || (role !== undefined && s.roles.includes(role))),
      ),
    [tour.steps, isMobile, role],
  );

  const [index, setIndex] = useState(0);
  /** Steps whose element never showed: left out of the "2 of 6" count and the dots */
  const [skipped, setSkipped] = useState<ReadonlySet<number>>(() => new Set());
  const [found, setFound] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [cardSize, setCardSize] = useState({ w: CARD_WIDTH, h: 240 });
  const direction = useRef<1 | -1>(1);
  const targetRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  const safeIndex = Math.min(index, Math.max(steps.length - 1, 0));
  const step: TourStep | undefined = steps[safeIndex];
  const isLast = safeIndex >= steps.length - 1;

  // Give focus back to where it was when the tour ends
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    return () => previous?.focus?.({ preventScroll: true });
  }, []);

  // Nothing to show for this layout or role
  useEffect(() => {
    if (steps.length === 0) onClose("completed");
  }, [steps.length, onClose]);

  const go = useCallback(
    (target: number) => {
      const dir: 1 | -1 = target >= safeIndex ? 1 : -1;
      // Jump straight past steps whose element isn't on screen, instead of waiting for each
      let next = target;
      const passed: number[] = [];
      while (next >= 0 && next < steps.length) {
        const s = steps[next];
        if (!s.target || s.ifMissing === "center" || findTarget(s.target)) break;
        passed.push(next);
        next += dir;
      }
      if (passed.length) setSkipped((prev) => new Set([...prev, ...passed]));
      if (next < 0) return; // nothing to go back to
      if (next >= steps.length) {
        onClose("completed");
        return;
      }
      direction.current = dir;
      setIndex(next);
    },
    [safeIndex, steps, onClose],
  );

  // Find this step's element (it may still be loading); skip the step if it never shows
  useEffect(() => {
    if (!step) return;
    // The highlight follows targetRef (see the loop below); null = centred card
    targetRef.current = null;
    if (!step.target) {
      setFound(true);
      return;
    }
    const startedAt = Date.now();
    let timer = 0;
    let first = true;
    const attempt = () => {
      const el = findTarget(step.target);
      if (el) {
        targetRef.current = el;
        setSkipped((s) => {
          if (!s.has(safeIndex)) return s;
          const next = new Set(s);
          next.delete(safeIndex);
          return next;
        });
        const r = el.getBoundingClientRect();
        const offscreen = r.top < 64 || r.bottom > window.innerHeight - 64;
        if (offscreen && r.height < window.innerHeight * 0.8) {
          el.scrollIntoView({ block: "center", inline: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
        }
        setFound(true);
        return;
      }
      // The first step waits for the screen's data; later steps were checked by Next already
      if (Date.now() - startedAt > (safeIndex === 0 ? FIND_TIMEOUT_MS : LATER_FIND_TIMEOUT_MS)) {
        if (step.ifMissing === "center") {
          setFound(true);
          return;
        }
        // Skip in the direction we were moving; past either end the tour is over
        setSkipped((s) => new Set(s).add(safeIndex));
        let next = safeIndex + direction.current;
        if (next < 0) {
          // Went Back onto a missing first step: carry on forward instead of ending
          direction.current = 1;
          next = safeIndex + 1;
        }
        if (next >= steps.length) onClose("completed");
        else setIndex(next);
        return;
      }
      // Not there yet (data still loading): hide the card while waiting
      if (first) setFound(false);
      first = false;
      timer = window.setTimeout(attempt, 120);
    };
    attempt();
    return () => window.clearTimeout(timer);
    // Runs per step; the other values are read fresh inside
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, safeIndex]);

  // Follow the element while it moves (scrolling, animations, layout changes)
  useEffect(() => {
    if (!found) return;
    let frame = 0;
    let last: Rect | null = null;
    const tick = () => {
      setViewport((v) =>
        v.w === window.innerWidth && v.h === window.innerHeight ? v : { w: window.innerWidth, h: window.innerHeight },
      );
      let el = targetRef.current;
      if (el && !el.isConnected) {
        el = findTarget(step?.target);
        targetRef.current = el;
      }
      const r = el ? el.getBoundingClientRect() : null;
      const next = r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null;
      if (!sameRect(last, next)) {
        last = next;
        setRect(next);
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [found, step]);

  // Card size, for placement next to the highlight. Measured when each step's card mounts:
  // with AnimatePresence "wait" the new card appears only after the old one has gone, so
  // an effect keyed on the step would still be looking at the old (or no) card.
  // offsetWidth/Height ignore the entrance scale transform.
  const resizeObserver = useRef<ResizeObserver | null>(null);
  const setCardEl = useCallback((el: HTMLDivElement | null) => {
    cardRef.current = el;
    resizeObserver.current?.disconnect();
    resizeObserver.current = null;
    if (!el) return;
    const measure = () =>
      setCardSize((s) =>
        s.w === el.offsetWidth && s.h === el.offsetHeight ? s : { w: el.offsetWidth, h: el.offsetHeight },
      );
    measure();
    resizeObserver.current = new ResizeObserver(measure);
    resizeObserver.current.observe(el);
  }, []);
  useEffect(() => () => resizeObserver.current?.disconnect(), []);

  // Focus the main button on every step, so Enter moves on
  useEffect(() => {
    if (!found) return;
    const frame = requestAnimationFrame(() => primaryRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [found, safeIndex]);

  // Keys work wherever focus is while the tour is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Leave browser shortcuts alone (Alt+← is Back)
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === "Tab" && !cardRef.current) {
        // Between steps there is no card yet: don't let focus wander into the page
        e.preventDefault();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose("skipped");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(safeIndex + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(safeIndex - 1);
      } else if (e.key === "Tab" && cardRef.current) {
        // Keep focus inside the card
        const items = cardRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]");
        if (items.length === 0) return;
        const first = items[0];
        const lastItem = items[items.length - 1];
        const active = document.activeElement;
        if (!cardRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          lastItem.focus();
        } else if (!e.shiftKey && active === lastItem) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [go, safeIndex, onClose]);

  if (!step || typeof document === "undefined") return null;

  const vw = viewport.w || window.innerWidth;
  const vh = viewport.h || window.innerHeight;
  const spot = rect ? spotlightRect(rect, vw, vh) : null;

  // Mobile: dock to the edge away from the highlight
  const dockTop = isMobile && spot !== null && spot.top + spot.height / 2 > vh * 0.55;
  const desktopPos = isMobile ? null : placeCard(spot, cardSize, vw, vh, step.placement);

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: motionTokens.duration.slow, ease: motionTokens.easing.standard };

  // Count only steps that can be shown
  const shownTotal = steps.length - skipped.size;
  const shownIndex = safeIndex - [...skipped].filter((i) => i < safeIndex).length;

  return createPortal(
    <div data-tour-active="">
      {/* Blocks the page underneath; the tour is driven from the card */}
      <div aria-hidden className="fixed inset-0 z-[80]" onClick={(e) => e.stopPropagation()} />

      {/* Dim layer with a hole around the element, or a plain dim for centred steps */}
      {spot ? (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed z-[81] rounded-xl ring-2 ring-primary"
          style={{ boxShadow: "0 0 0 200vmax var(--scrim)" }}
          initial={false}
          animate={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
          transition={transition}
        />
      ) : (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[81] bg-scrim" />
      )}

      {/* One card for the whole tour: steps swap its content and position, no exit/enter wait */}
      <AnimatePresence>
        {found && (
          <motion.div
            ref={setCardEl}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            data-tour-card=""
            className={cn(
              "fixed z-[82] flex flex-col overflow-hidden rounded-2xl bg-surface-container shadow-modal",
              isMobile ? "inset-x-3 mx-auto max-h-[min(62dvh,540px)] max-w-lg" : "max-h-[calc(100dvh-24px)]",
            )}
            style={
              isMobile
                ? dockTop
                  ? { top: "calc(var(--safe-top) + 12px)" }
                  : { bottom: "calc(var(--safe-bottom) + 12px)" }
                : { top: desktopPos!.top, left: desktopPos!.left, width: Math.min(CARD_WIDTH, vw - EDGE * 2) }
            }
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: isMobile ? (dockTop ? -12 : 12) : 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition }}
            exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : motionTokens.duration.fast } }}
          >
            <motion.div
              key={safeIndex}
              className="overflow-y-auto overscroll-contain p-4 pb-3"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: motionTokens.duration.fast } }}
            >
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-caption font-medium text-on-surface-variant">
                  {tour.title}
                  <span aria-hidden> · </span>
                  <span className="tabular-nums">
                    {shownIndex + 1} of {shownTotal}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => onClose("skipped")}
                  aria-label="Close tour"
                  className="-mr-1.5 -mt-1 grid size-9 shrink-0 place-items-center rounded-lg text-on-surface-variant outline-none transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <h2 id={titleId} className="mt-1 text-title-sm font-semibold text-on-surface">
                {step.title}
              </h2>
              <p id={bodyId} className="mt-1 text-body leading-relaxed text-on-surface-variant">
                {step.body}
              </p>
              {step.example && <TourExample example={step.example} />}
            </motion.div>

            <div className="flex shrink-0 items-center gap-2 border-t border-outline-variant px-4 py-3">
              <div
                className="mr-auto flex min-w-0 items-center gap-1"
                role="progressbar"
                aria-label="Tour progress"
                aria-valuemin={1}
                aria-valuemax={shownTotal}
                aria-valuenow={shownIndex + 1}
              >
                {shownTotal <= 8 ? (
                  steps.map((_, i) => skipped.has(i) ? null : (
                    <span
                      key={i}
                      aria-hidden
                      className={cn(
                        "h-1.5 rounded-full transition-[width,background-color] duration-200",
                        i === safeIndex
                          ? "w-4 bg-primary"
                          : i < safeIndex
                            ? "w-1.5 bg-primary/50"
                            : "w-1.5 bg-outline-variant",
                      )}
                    />
                  ))
                ) : (
                  <span aria-hidden className="block h-1.5 w-20 overflow-hidden rounded-full bg-outline-variant">
                    <span
                      className="block h-full rounded-full bg-primary transition-[width] duration-200"
                      style={{ width: `${((shownIndex + 1) / Math.max(shownTotal, 1)) * 100}%` }}
                    />
                  </span>
                )}
              </div>

              {safeIndex === 0 && !isLast && (
                <Button variant="ghost" size="sm" onClick={() => onClose("skipped")}>
                  Skip
                </Button>
              )}
              {safeIndex > 0 && (
                <Button variant="secondary" size="sm" onClick={() => go(safeIndex - 1)} aria-label="Previous step">
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  <span className="max-sm:hidden">Back</span>
                </Button>
              )}
              <Button ref={primaryRef} size="sm" onClick={() => go(safeIndex + 1)}>
                {isLast ? "Done" : "Next"}
                {!isLast && <ArrowRight className="h-4 w-4" aria-hidden />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen readers hear each step as it opens */}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {found ? `Step ${shownIndex + 1} of ${shownTotal}: ${step.title}` : ""}
      </p>
    </div>,
    document.body,
  );
}
