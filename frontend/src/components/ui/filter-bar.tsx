import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Select, type SelectProps } from "./select";

/** All of a list's filters on one row (tabs, chips, selects), wrapping only when it must. */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div data-tour="filter-bar" className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
    </div>
  );
}

/** Thin separator between filter groups. Hidden on phones, where the bar scrolls instead. */
export function FilterBarDivider() {
  return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-outline-variant max-lg:hidden" />;
}

interface FilterSelectProps extends Omit<SelectProps, "variant" | "aria-label"> {
  /** Accessible name; the first option ("All owners") is the visible label. */
  label: string;
  /** Show the select as set (tinted) when a value is chosen. */
  active?: boolean;
  /** Classes for the wrapper, e.g. "max-lg:w-full" (pair with className "w-full") on phones. */
  wrapperClassName?: string;
}

/**
 * Compact pill dropdown for a filter bar. Set filters read like the active chip (filled),
 * so all filters share one language. Opens the app's rounded menu (a sheet on phones).
 */
export function FilterSelect({ label, active, className, wrapperClassName, children, ...props }: FilterSelectProps) {
  return (
    <span className={cn("relative inline-flex", wrapperClassName)}>
      <Select
        {...props}
        variant="filter"
        aria-label={label}
        sheetTitle={props.sheetTitle ?? label}
        active={active}
        className={className}
      >
        {children}
      </Select>
    </span>
  );
}
