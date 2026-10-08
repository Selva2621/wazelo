"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { Modal } from "./modal";
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
  return (
    <Modal
      open={open}
      onClose={onCancel}
      dismissible={!loading}
      aria-labelledby="confirm-dialog-title"
      className="max-w-[400px]"
    >
      {() => (
        <>
          <div className="px-6 pt-6 pb-4">
            {/* Icon */}
            <div
              className={cn(
                "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full",
                variant === "danger" && "bg-error/10",
                variant === "warning" && "bg-warning/10",
                variant === "default" && "bg-primary/10",
              )}
            >
              <AlertTriangle
                className={cn(
                  "h-6 w-6",
                  variant === "danger" && "text-error",
                  variant === "warning" && "text-warning",
                  variant === "default" && "text-primary",
                )}
              />
            </div>

            {/* Content */}
            <h3 id="confirm-dialog-title" className="text-center text-title-sm font-semibold text-on-surface">
              {title}
            </h3>
            <p className="mt-2 text-center text-body text-on-surface-variant leading-relaxed">
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
        </>
      )}
    </Modal>
  );
}
