import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StartHintProps {
  icon: ReactNode;
  /** One short line: what is missing. */
  title: string;
  /** One short line: what makes data appear. */
  description?: ReactNode;
  /** Buttons or links, right-aligned on desktop. */
  action?: ReactNode;
  className?: string;
}

/**
 * Slim "how to start" strip for a page that has no data yet. The page keeps its real layout
 * (stat cards, charts, tables at zero) under this strip, so it never shows a lone centred icon
 * on a blank screen.
 */
export function StartHint({ icon, title, description, action, className }: StartHintProps) {
  return (
    <div
      data-tour="empty-state"
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-3",
        className,
      )}
    >
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary [&>svg]:h-[18px] [&>svg]:w-[18px]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold text-on-surface">{title}</p>
        {description && <p className="text-label text-on-surface-variant">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

/** Muted placeholder inside a zero-data card or chart frame. */
export function ZeroNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("grid min-h-28 place-items-center text-center text-label text-on-surface-variant/70", className)}>
      {children}
    </p>
  );
}
