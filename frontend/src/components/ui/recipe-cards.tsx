"use client";

import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RecipeCardItem {
  id: string;
  icon: ReactNode;
  title: string;
  summary: string;
  /** Something the user still has to choose after picking it */
  needs?: string;
}

interface RecipeCardsProps {
  title?: string;
  items: RecipeCardItem[];
  onPick: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

/** "Start from a recipe" row — each card opens a ready-made setup the user can edit */
export function RecipeCards({ title = "Start from a recipe", items, onPick, disabled, className }: RecipeCardsProps) {
  if (items.length === 0) return null;
  return (
    <section className={className} aria-label={title}>
      <h2 className="text-label font-medium text-on-surface-variant mb-2">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(item.id)}
            className={cn(
              "group text-left rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-3.5 transition-all",
              "hover:border-primary/30 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              "disabled:opacity-60 disabled:pointer-events-none",
            )}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {item.icon}
              </span>
              <span className="text-body font-semibold text-on-surface flex-1 min-w-0 truncate">{item.title}</span>
              <ArrowRight className="h-3.5 w-3.5 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
            </div>
            <p className="text-label text-on-surface-variant leading-snug">{item.summary}</p>
            {item.needs && <p className="text-caption text-on-surface-variant/60 mt-1">{item.needs}</p>}
          </button>
        ))}
      </div>
    </section>
  );
}
