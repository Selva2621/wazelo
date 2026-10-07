import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "muted";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-container-high text-on-surface-variant",
  primary: "bg-primary/15 text-primary-container",
  success: "bg-success-container text-success",
  warning: "bg-warning-container text-warning",
  error: "bg-error-container text-error",
  info: "bg-info-container text-info",
  muted: "bg-surface-container text-on-surface-variant",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

interface CountBadgeProps {
  count: number;
  className?: string;
}

export function CountBadge({ count, className }: CountBadgeProps) {
  if (count <= 0) return null;
  const display = count > 99 ? "99+" : String(count);

  return (
    <span
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-caption font-semibold tabular-nums text-on-primary",
        className,
      )}
    >
      {display}
    </span>
  );
}
