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
  primary: "bg-primary text-on-primary hover:bg-primary-container",
  secondary:
    "border border-outline-variant bg-transparent text-on-surface hover:bg-surface-container-low",
  ghost:
    "bg-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
  destructive: "bg-error text-on-error hover:bg-error/90",
  link: "bg-transparent text-primary-container underline-offset-4 hover:underline p-0 h-auto",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-body",
  md: "h-9 px-4 text-body-lg",
  lg: "h-11 px-5 text-body-lg",
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
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium",
          "transition-[background-color,color,border-color,transform] duration-120 ease-standard active:scale-[0.98]",
          "outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          "disabled:pointer-events-none disabled:opacity-50",
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
