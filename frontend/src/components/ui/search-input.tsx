"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  shortcutHint?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, shortcutHint, ...props }, ref) => {
    return (
      <div className={cn("relative", className)}>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <input
          ref={ref}
          type="text"
          className={cn(
            "h-9 w-full rounded-lg border border-outline-variant bg-surface-container-low pl-9 pr-3 text-body text-on-surface placeholder:text-placeholder outline-none",
            "transition-[border-color,box-shadow] duration-120 ease-standard hover:border-outline",
            "focus:border-primary focus:ring-2 focus:ring-primary/30",
            shortcutHint && "pr-14",
          )}
          {...props}
        />
        {shortcutHint && (
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-outline-variant bg-surface-container px-1.5 py-0.5 text-caption font-normal text-on-surface-variant font-mono">
            {shortcutHint}
          </kbd>
        )}
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";
