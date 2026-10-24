"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { cn } from "@/lib/utils";

const SHEET_SPRING = { type: "spring", stiffness: 420, damping: 40, mass: 0.9 } as const;

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name */
  title: string;
  /** Visible title row with the grabber; omit for a bare sheet */
  showHeader?: boolean;
  /** Right-side header button (e.g. "Done") */
  headerAction?: ReactNode;
  children: ReactNode;
  /** Max height as a fraction of the screen (default 0.9) */
  maxHeight?: number;
  className?: string;
}

/**
 * iOS sheet that slides up from the bottom. Drag the grabber (or the header) down
 * to dismiss, tap the dimmed backdrop, or press Escape. Body scroll is locked
 * while open; content scrolls inside the sheet.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  showHeader = true,
  headerAction,
  children,
  maxHeight = 0.9,
  className,
}: BottomSheetProps) {
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    sheetRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-scrim"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          />
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className={cn("ios-sheet absolute inset-x-0 bottom-0 mx-auto flex max-w-2xl flex-col outline-none", className)}
            style={{ maxHeight: `${maxHeight * 100}dvh` }}
            initial={{ y: "100%" }}
            animate={{ y: 0, transition: SHEET_SPRING }}
            exit={{ y: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.8 }}
            onDragEnd={onDragEnd}
          >
            <div
              className="shrink-0 cursor-grab touch-none pt-2 active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="mx-auto h-[5px] w-9 rounded-full bg-outline/50" aria-hidden />
              {showHeader && (
                <div className="relative flex h-11 items-center justify-center px-4">
                  <p className="truncate text-[17px] font-semibold text-on-surface">{title}</p>
                  <div className="absolute right-3">{headerAction}</div>
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(16px,var(--safe-bottom))]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
