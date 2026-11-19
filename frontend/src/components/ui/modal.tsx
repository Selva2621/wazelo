"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "motion/react";
import { cn } from "@/lib/utils";
import { motionTokens, springs } from "@/lib/motion-tokens";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  /** False blocks backdrop clicks and Escape, e.g. while a save is in flight. */
  dismissible?: boolean;
  /** Classes for the panel: width, padding, radius, layout. */
  className?: string;
  /** Stacking layer for the overlay. Raise it for an overlay opened from another one. */
  zIndexClassName?: string;
  /**
   * Panel content, as a function so it is only built while open (content may read data
   * that only exists then). The last output stays on screen during the exit animation.
   */
  children: () => ReactNode;
  "aria-labelledby"?: string;
  "aria-label"?: string;
}

const backdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: motionTokens.duration.base } },
  exit: { opacity: 0, transition: { duration: motionTokens.duration.base, ease: motionTokens.easing.exit } },
};

/* Phones and tablets: every Modal and Drawer opens as an iOS sheet from the bottom */
const sheetMotion = {
  initial: { y: "100%" },
  animate: { y: 0, transition: { type: "spring", stiffness: 420, damping: 40, mass: 0.9 } as const },
  exit: { y: "100%", transition: { duration: 0.22, ease: motionTokens.easing.exit } },
};

function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, onClose]);
}

/** Lock page scroll behind a mobile sheet (iOS otherwise scrolls the page under it). */
function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [active]);
}

/** Grabber at the top of a mobile sheet; dragging it down closes the sheet. */
function SheetGrabber({ onPointerDown }: { onPointerDown: (e: React.PointerEvent) => void }) {
  return (
    <div
      aria-hidden
      className="sticky top-0 z-20 -mb-5 flex h-5 cursor-grab touch-none justify-center pt-1.5"
      onPointerDown={onPointerDown}
    >
      <span className="h-[5px] w-9 rounded-full bg-outline/50" />
    </div>
  );
}

function useSheetDrag(onClose: () => void, dismissible: boolean) {
  const dragControls = useDragControls();
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (dismissible && (info.offset.y > 120 || info.velocity.y > 600)) onClose();
  };
  return {
    start: (e: React.PointerEvent) => dragControls.start(e),
    props: {
      drag: "y" as const,
      dragListener: false,
      dragControls,
      dragConstraints: { top: 0, bottom: 0 },
      dragElastic: { top: 0.04, bottom: 0.7 },
      onDragEnd,
    },
  };
}

/** Centered dialog with an animated backdrop and panel (enter and exit). */
export function Modal({
  open,
  onClose,
  dismissible = true,
  className,
  zIndexClassName = "z-50",
  children,
  ...aria
}: OverlayProps) {
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const drag = useSheetDrag(onClose, dismissible);
  useEscape(open && dismissible, onClose);
  useScrollLock(open && isMobile);

  if (isMobile) {
    return (
      <AnimatePresence propagate>
        {open && (
          <div key="modal" className={cn("fixed inset-0 flex items-end justify-center", zIndexClassName)}>
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-scrim"
              onClick={() => dismissible && onClose()}
              {...backdropMotion}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              {...aria}
              className={cn(
                "relative w-full overflow-y-auto overscroll-contain bg-surface-container-lowest shadow-modal",
                className,
                // Never wider than the phone: content scrolls up and down only
                "min-w-0 overflow-x-hidden",
                // A ModalFooter carries its own safe-area padding
                "[&:has([data-sheet-footer])>[data-sheet-spacer]]:hidden",
                "ios-modal-sheet",
              )}
              {...(reduceMotion ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } : sheetMotion)}
              {...drag.props}
            >
              <SheetGrabber onPointerDown={drag.start} />
              {children()}
              <div aria-hidden data-sheet-spacer className="h-[var(--safe-bottom)]" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  return (
    // propagate: a caller that unmounts the whole modal inside its own <AnimatePresence>
    // still gets this exit animation.
    <AnimatePresence propagate>
      {open && (
        <div key="modal" className={cn("fixed inset-0 flex items-center justify-center p-4", zIndexClassName)}>
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-scrim"
            onClick={() => dismissible && onClose()}
            {...backdropMotion}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            {...aria}
            className={cn(
              "relative w-full max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-surface-container-lowest shadow-modal",
              className,
            )}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: motionTokens.distance.md }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: springs.gentle }}
            exit={
              reduceMotion
                ? { opacity: 0, transition: { duration: motionTokens.duration.fast } }
                : {
                    opacity: 0,
                    scale: 0.97,
                    y: motionTokens.distance.sm,
                    transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.exit },
                  }
            }
          >
            {children()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Action row at the end of a Modal. Desktop: renders exactly with the given classes.
 * Phones: sticks to the bottom of the sheet, clears the home indicator, and the caller's
 * buttons can use `max-lg:flex-1` to fill the width.
 */
export function ModalFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      data-sheet-footer
      className={cn(
        className,
        "max-lg:sticky max-lg:bottom-0 max-lg:z-10 max-lg:bg-surface-container-lowest max-lg:pb-[max(12px,var(--safe-bottom))]",
      )}
    >
      {children}
    </div>
  );
}

/** Edge-anchored panel (default: right) that slides in and out over an animated backdrop. */
export function Drawer({
  open,
  onClose,
  dismissible = true,
  className,
  zIndexClassName = "z-50",
  side = "right",
  children,
  ...aria
}: OverlayProps & { side?: "left" | "right" | "bottom" }) {
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const drag = useSheetDrag(onClose, dismissible);
  useEscape(open && dismissible, onClose);
  useScrollLock(open && isMobile);
  const isBottom = side === "bottom";
  const offscreen = isBottom ? { y: "100%" } : { x: side === "right" ? "100%" : "-100%" };

  if (isMobile) {
    // Side panels become a tall sheet; bottom drawers keep their height
    return (
      <AnimatePresence propagate>
        {open && (
          <div key="drawer" className={cn("fixed inset-0", zIndexClassName)}>
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-scrim"
              onClick={() => dismissible && onClose()}
              {...backdropMotion}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              {...aria}
              className={cn(
                "absolute inset-x-0 bottom-0 flex w-full flex-col bg-surface-container-lowest shadow-modal",
                className,
                isBottom ? "ios-modal-sheet" : "ios-drawer-sheet",
              )}
              {...(reduceMotion ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } : sheetMotion)}
              {...drag.props}
            >
              <SheetGrabber onPointerDown={drag.start} />
              {children()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence propagate>
      {open && (
        <div key="drawer" className={cn("fixed inset-0", zIndexClassName)}>
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-scrim"
            onClick={() => dismissible && onClose()}
            {...backdropMotion}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            {...aria}
            className={cn(
              "absolute flex w-full flex-col bg-surface-container-lowest shadow-modal border-outline-variant",
              isBottom
                ? "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t"
                : cn("top-0 h-full", side === "right" ? "right-0 border-l" : "left-0 border-r"),
              className,
            )}
            initial={reduceMotion ? { opacity: 0 } : offscreen}
            animate={{ x: 0, y: 0, opacity: 1, transition: { duration: motionTokens.duration.slow * 1.25, ease: motionTokens.easing.standard } }}
            exit={
              reduceMotion
                ? { opacity: 0, transition: { duration: motionTokens.duration.fast } }
                : { ...offscreen, transition: { duration: motionTokens.duration.base, ease: motionTokens.easing.exit } }
            }
          >
            {children()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
