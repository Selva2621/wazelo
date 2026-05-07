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
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/50" />
        <input
          ref={ref}
          type="text"
          className={cn(
            "w-full rounded-xl bg-surface-container-low pl-9 pr-4 py-2.5 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 outline-none",
            "focus:bg-surface-container focus:ring-2 focus:ring-primary/40",
            shortcutHint && "pr-14",
          )}
          {...props}
        />
        {shortcutHint && (
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-outline-variant/30 bg-surface-container px-1.5 py-0.5 text-[10px] text-on-surface-variant/60 font-mono">
            {shortcutHint}
          </kbd>
        )}
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";
