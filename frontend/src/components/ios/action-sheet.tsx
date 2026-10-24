"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

export interface ActionSheetAction {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actions: ActionSheetAction[];
  cancelLabel?: string;
}

/**
 * iOS action sheet: a stack of choices plus a separate Cancel button, sliding up
 * from the bottom. Use it for confirmations ("Sign out?") and row actions.
 */
export function ActionSheet({ open, onClose, title, message, actions, cancelLabel = "Cancel" }: ActionSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-scrim"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title ?? "Actions"}
            className="ios-action-sheet absolute inset-x-2 mx-auto flex max-w-md flex-col gap-2"
            style={{ bottom: "max(8px, var(--safe-bottom))" }}
            initial={{ y: "110%" }}
            animate={{ y: 0, transition: { type: "spring", stiffness: 460, damping: 40 } }}
            exit={{ y: "110%", transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
          >
            <div className="ios-action-group">
              {(title || message) && (
                <div className="px-4 py-3 text-center">
                  {title && <p className="text-[13px] font-semibold text-on-surface-variant">{title}</p>}
                  {message && <p className="mt-0.5 text-[13px] text-on-surface-variant">{message}</p>}
                </div>
              )}
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  disabled={action.disabled}
                  onClick={() => {
                    haptic(action.destructive ? "warning" : "light");
                    onClose();
                    action.onSelect();
                  }}
                  className={cn(
                    "ios-action-button",
                    action.destructive ? "text-error" : "text-primary",
                    action.disabled && "opacity-40",
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={onClose} className="ios-action-group ios-action-button font-semibold text-primary">
              {cancelLabel}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
