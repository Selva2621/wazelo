import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode, SelectHTMLAttributes } from "react";

/** All of a list's filters on one row (tabs, chips, selects), wrapping only when it must. */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

/** Thin separator between filter groups. Hidden on phones, where the bar scrolls instead. */
export function FilterBarDivider() {
  return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-outline-variant max-lg:hidden" />;
}

interface FilterSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Accessible name; the first option ("All owners") is the visible label. */
  label: string;
  /** Show the select as set (tinted) when a value is chosen. */
  active?: boolean;
  /** Classes for the wrapper, e.g. "max-lg:w-full" (pair with className "w-full") on phones. */
  wrapperClassName?: string;
}

/** Compact select for a filter bar, with a chevron so it reads as a control. */
export function FilterSelect({ label, active, className, wrapperClassName, children, ...props }: FilterSelectProps) {
  return (
    <span className={cn("relative inline-flex", wrapperClassName)}>
      <select
        aria-label={label}
        className={cn(
          "h-8 cursor-pointer appearance-none rounded-full border pl-3 pr-8 text-label font-medium outline-none transition-colors duration-120 ease-standard",
          "focus-visible:ring-2 focus-visible:ring-focus",
          // Set filters read like the active chip (filled), so all filters share one language
          active
            ? "border-transparent bg-on-surface text-surface"
            : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline hover:text-on-surface",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className={cn(
          "pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2",
          active ? "text-surface" : "text-on-surface-variant",
        )}
      />
    </span>
  );
}
