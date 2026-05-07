import { cn } from "@/lib/utils";
import { Button } from "./button";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-16",
        className,
      )}
    >
      <div className="mb-5 text-primary">{icon}</div>
      <h3 className="text-xl font-semibold text-on-surface mb-2">{title}</h3>
      <p className="text-[14px] text-on-surface-variant max-w-[400px] leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-6">
          {actionLabel}
        </Button>
      )}
      {secondaryLabel && onSecondary && (
        <button
          onClick={onSecondary}
          className="mt-3 text-[13px] text-primary hover:underline"
        >
          {secondaryLabel}
        </button>
      )}
    </div>
  );
}
