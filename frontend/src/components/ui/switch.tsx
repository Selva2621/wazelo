"use client";

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  disabled?: boolean;
  className?: string;
}

/** On/off toggle, styled like the chatbot editor's switches. */
export function Switch({ checked, onChange, disabled, className, ...aria }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50",
        checked ? "bg-primary" : "bg-surface-container-highest",
        className,
      )}
      {...aria}
    >
      <span
        className={cn(
          "absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
