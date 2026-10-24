"use client";

import { useRef, useState, type ReactNode } from "react";
import { animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

export interface SwipeAction {
  label: string;
  icon?: ReactNode;
  /** Background class, e.g. "bg-error" */
  className: string;
  onAction: () => void;
}

const ACTION_WIDTH = 76;

/**
 * List row that slides left to reveal actions (iOS Mail style). A long swipe runs
 * the last action straight away. Taps on the row still work when it is closed.
 */
export function SwipeRow({
  actions,
  children,
  className,
}: {
  actions: SwipeAction[];
  children: ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  // Actions stay invisible at rest, so they never peek out at a rounded corner
  const actionsOpacity = useTransform(x, [-12, 0], [1, 0]);
  const [open, setOpen] = useState(false);
  const dragged = useRef(false);
  const revealWidth = actions.length * ACTION_WIDTH;

  const settle = (to: number) => {
    animate(x, to, { type: "spring", stiffness: 500, damping: 42 });
    setOpen(to !== 0);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const offset = x.get();
    const rowWidth = containerRef.current?.offsetWidth ?? 375;
    // Full swipe: run the last (primary) action
    if (offset < -rowWidth * 0.55 && actions.length > 0) {
      haptic("medium");
      settle(0);
      actions[actions.length - 1].onAction();
      return;
    }
    settle(offset < -revealWidth / 2 || info.velocity.x < -400 ? -revealWidth : 0);
  };

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      <motion.div className="absolute inset-y-0 right-0 flex" style={{ opacity: actionsOpacity }} aria-hidden={!open}>
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            tabIndex={open ? 0 : -1}
            onClick={() => {
              haptic();
              settle(0);
              action.onAction();
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[13px] font-medium text-white",
              action.className,
            )}
            style={{ width: ACTION_WIDTH }}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </motion.div>
      <motion.div
        className="relative touch-pan-y bg-[var(--ios-row-bg)]"
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -revealWidth * 2.5, right: 0 }}
        dragElastic={{ left: 0.1, right: 0 }}
        dragMomentum={false}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={onDragEnd}
        onClickCapture={(e) => {
          // After a drag, or while open, a tap closes the row instead of opening the item
          if (dragged.current || open) {
            e.preventDefault();
            e.stopPropagation();
            dragged.current = false;
            if (open) settle(0);
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
