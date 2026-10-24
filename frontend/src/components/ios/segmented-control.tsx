"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  /** Accessible group name */
  label: string;
  className?: string;
}

/** iOS segmented control: a sliding thumb behind the selected option. */
export function SegmentedControl<T extends string>({ value, onChange, options, label, className }: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("ios-segmented", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              if (!selected) haptic();
              onChange(option.value);
            }}
            className={cn(
              "relative z-[1] flex-1 truncate px-3 text-[13px] leading-[28px] transition-colors duration-150",
              selected ? "font-semibold text-on-surface" : "font-medium text-on-surface-variant",
            )}
          >
            {selected && (
              <motion.span
                layoutId={`seg-${label}`}
                className="ios-segmented-thumb absolute inset-0 -z-[1]"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
