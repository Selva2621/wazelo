import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "link";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-primary to-primary-container text-on-primary font-medium hover:shadow-[0_0_20px_var(--primary-glow)] active:scale-[0.98]",
  secondary:
    "border border-outline-variant bg-transparent text-primary-container hover:bg-surface-container-low",
  ghost:
    "bg-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
  destructive:
    "bg-error text-white font-medium hover:bg-error/90",
  link: "bg-transparent text-primary underline-offset-4 hover:underline p-0 h-auto",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-9 px-3 text-[13px] rounded-lg",
  md: "h-11 px-5 text-[14px] rounded-xl",
  lg: "h-12 px-6 text-[15px] rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
          variant !== "link" && sizeStyles[size],
          variantStyles[variant],
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Spinner size="sm" />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
