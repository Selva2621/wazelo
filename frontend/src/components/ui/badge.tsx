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
  primary: "bg-primary/15 text-primary",
  success: "bg-success-container text-success",
  warning: "bg-warning-container text-warning",
  error: "bg-error-container text-error",
  info: "bg-[#1e3a5f] text-[#60a5fa]",
  muted: "bg-surface-container text-on-surface-variant",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-tight",
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
        "inline-flex items-center justify-center rounded-full bg-primary text-on-primary font-semibold",
        display.length <= 2
          ? "h-5 w-5 text-[10px]"
          : "h-5 min-w-5 px-1.5 text-[10px]",
        className,
      )}
    >
      {display}
    </span>
  );
}
