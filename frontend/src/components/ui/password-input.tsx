"use client";

import { forwardRef, type InputHTMLAttributes, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, id, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const errorId = id ? `${id}-error` : undefined;

    return (
      <div className="w-full">
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={visible ? "text" : "password"}
            className={cn(
              "w-full rounded-xl bg-surface-container-low px-4 py-3 pr-11 text-[15px] text-on-surface placeholder:text-on-surface-variant/50 outline-none",
              "focus:bg-surface-container focus:ring-2 focus:ring-primary/40",
              error &&
                "bg-error-container focus:bg-error-container focus:ring-error/40",
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
          <p id={errorId} className="mt-1.5 text-[13px] text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";
