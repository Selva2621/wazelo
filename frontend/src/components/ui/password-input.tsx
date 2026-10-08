"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  /** Decorative icon inside the field, on the left. */
  leadingIcon?: ReactNode;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, id, leadingIcon, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const errorId = id ? `${id}-error` : undefined;

    return (
      <div className="w-full">
        <div className="relative">
          {leadingIcon && (
            <span
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant [&_svg]:h-4 [&_svg]:w-4"
            >
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            type={visible ? "text" : "password"}
            className={cn(
              "h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 pr-10 text-body-lg text-on-surface placeholder:text-placeholder outline-none",
              "transition-[border-color,box-shadow] duration-120 ease-standard hover:border-outline",
              "focus:border-primary focus:ring-2 focus:ring-primary/30",
              "disabled:cursor-not-allowed disabled:opacity-50",
              leadingIcon && "pl-10",
              error &&
                "border-error hover:border-error focus:border-error focus:ring-error/30",
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
            tabIndex={-1}
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? (
              <EyeOff className="h-4.5 w-4.5" />
            ) : (
              <Eye className="h-4.5 w-4.5" />
            )}
          </button>
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-caption text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";
