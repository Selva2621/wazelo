import { cn } from "@/lib/utils";
import { SplitText } from "@/components/ui/split-text";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  /** Muted number next to the title, e.g. the total row count. */
  count?: number;
  /** One short line under the title. Leave it out when the controls speak for themselves. */
  description?: ReactNode;
  /** Right-aligned page actions: search, secondary icon buttons, then the primary button last. */
  actions?: ReactNode;
  className?: string;
}

/**
 * The one title row of an app page (Quiet Ops). The header bar repeats the title only after
 * this heading scrolls away (AppShell), so the page never shows it twice.
 */
export function PageHeader({ title, count, description, actions, className }: PageHeaderProps) {
  return (
    <div data-tour="page-header" className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-3", className)}>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <h1 className="truncate text-headline font-semibold text-on-surface">
            {typeof title === "string" ? <SplitText text={title} /> : title}
          </h1>
          {count !== undefined && (
            <span className="rise-in text-body tabular-nums text-on-surface-variant">{count.toLocaleString("en-IN")}</span>
          )}
        </div>
        {description && <p className="rise-in mt-0.5 text-body text-on-surface-variant">{description}</p>}
      </div>
      {actions && (
        <div data-tour="page-actions" className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
