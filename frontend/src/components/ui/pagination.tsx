"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Build visible page numbers: always show first, last, current, and neighbors
  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - 1 && i <= page + 1)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between px-5 py-3 border-t border-outline-variant/10",
        className,
      )}
    >
      <span className="text-[12px] text-on-surface-variant tabular-nums">
        Page {page} of {totalPages}
        <span className="text-on-surface-variant/50 ml-1">
          ({total.toLocaleString()} total)
        </span>
      </span>

      <div className="flex items-center gap-0.5">
        {/* Previous */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page numbers */}
        {pages.map((p, idx) =>
          p === "..." ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-1 text-[12px] text-on-surface-variant/40"
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                "min-w-[28px] h-7 rounded-lg text-[12px] font-medium transition-colors tabular-nums",
                p === page
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container",
              )}
            >
              {p}
            </button>
          ),
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
