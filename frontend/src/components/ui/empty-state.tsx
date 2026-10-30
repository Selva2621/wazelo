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

/** Shown instead of an empty state when a list failed to load, so failures don't read as "no data". */
export function LoadError({
  what,
  onRetry,
  className,
}: {
  /** What failed, e.g. "campaigns". */
  what: string;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-xl bg-error-container p-6 text-center", className)}>
      <p className="text-body text-error">Couldn&apos;t load {what}. Check your connection and try again.</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
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
      data-tour="empty-state"
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-16",
        className,
      )}
    >
      <div className="mb-5 text-primary">{icon}</div>
      <h3 className="text-title font-semibold text-on-surface mb-2">{title}</h3>
      <p className="text-body-lg text-on-surface-variant max-w-[400px] leading-relaxed">
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
          className="mt-3 text-body text-primary hover:underline"
        >
          {secondaryLabel}
        </button>
      )}
    </div>
  );
}
