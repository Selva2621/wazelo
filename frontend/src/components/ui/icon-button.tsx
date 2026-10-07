import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "ghost" | "primary" | "danger";
type Size = "xs" | "sm" | "md";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Required: icon-only controls have no visible text. */
  "aria-label": string;
}

const variantStyles: Record<Variant, string> = {
  ghost: "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
  primary: "bg-primary text-on-primary hover:bg-primary-container",
  danger: "text-on-surface-variant hover:bg-error/10 hover:text-error",
};

// xs: inline in chips, inputs and dense rows. sm: toolbars. md: default (36px).
const sizeStyles: Record<Size, string> = {
  xs: "h-6 w-6 rounded-md",
  sm: "h-8 w-8 rounded-lg",
  md: "h-9 w-9 rounded-lg",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "ghost", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        "transition-[background-color,color,transform] duration-120 ease-standard active:scale-[0.96]",
        "outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "disabled:pointer-events-none disabled:opacity-50",
        sizeStyles[size],
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  ),
);

IconButton.displayName = "IconButton";
