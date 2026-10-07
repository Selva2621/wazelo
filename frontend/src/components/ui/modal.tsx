"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { motionTokens, springs } from "@/lib/motion-tokens";

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

function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, onClose]);
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
  useEscape(open && dismissible, onClose);

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
}: OverlayProps & { side?: "left" | "right" }) {
  const reduceMotion = useReducedMotion();
  useEscape(open && dismissible, onClose);
  const offscreen = side === "right" ? "100%" : "-100%";

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
              "absolute top-0 flex h-full w-full flex-col bg-surface-container-lowest shadow-modal",
              side === "right" ? "right-0 border-l" : "left-0 border-r",
              "border-outline-variant",
              className,
            )}
            initial={reduceMotion ? { opacity: 0 } : { x: offscreen }}
            animate={{ x: 0, opacity: 1, transition: { duration: motionTokens.duration.slow * 1.25, ease: motionTokens.easing.standard } }}
            exit={
              reduceMotion
                ? { opacity: 0, transition: { duration: motionTokens.duration.fast } }
                : { x: offscreen, transition: { duration: motionTokens.duration.base, ease: motionTokens.easing.exit } }
            }
          >
            {children()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
