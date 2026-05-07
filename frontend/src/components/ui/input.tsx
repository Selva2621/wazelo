import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, id, ...props }, ref) => {
    const errorId = id ? `${id}-error` : undefined;

    return (
      <div className="w-full">
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-xl bg-surface-container-low px-4 py-3 text-[15px] text-on-surface placeholder:text-on-surface-variant/50 outline-none",
            "focus:bg-surface-container focus:ring-2 focus:ring-primary/40",
            error &&
              "bg-error-container focus:bg-error-container focus:ring-error/40",
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-[13px] text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
