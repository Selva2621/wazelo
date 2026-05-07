"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface/60 backdrop-blur-[3px]"
        onClick={() => !loading && onCancel()}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-[400px] mx-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="px-6 pt-6 pb-4">
          {/* Icon */}
          <div
            className={cn(
              "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full",
              variant === "danger" && "bg-error/10",
              variant === "warning" && "bg-amber-500/10",
              variant === "default" && "bg-primary/10",
            )}
          >
            <AlertTriangle
              className={cn(
                "h-6 w-6",
                variant === "danger" && "text-error",
                variant === "warning" && "text-amber-500",
                variant === "default" && "text-primary",
              )}
            />
          </div>

          {/* Content */}
          <h3 className="text-center text-[16px] font-semibold text-on-surface">
            {title}
          </h3>
          <p className="mt-2 text-center text-[13px] text-on-surface-variant leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6 pt-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "destructive" : "primary"}
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
