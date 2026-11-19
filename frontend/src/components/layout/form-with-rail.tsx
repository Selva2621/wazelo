import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface FormWithRailProps {
  /** The form cards. They keep a readable width. */
  children: ReactNode;
  /** Summary / status / preview cards for the right side. Shown from xl up; below that it drops under the form. */
  rail: ReactNode;
  className?: string;
}

/**
 * Form pages: form on the left at a readable width, a sticky side panel on the right, so wide
 * screens don't show an empty band beside the form. Below xl the panel stacks under the form.
 */
export function FormWithRail({ children, rail, className }: FormWithRailProps) {
  return (
    <div className={cn("grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]", className)}>
      <div className="min-w-0 space-y-5">{children}</div>
      <aside className="min-w-0 space-y-4 xl:sticky xl:top-[calc(var(--header-height)+1rem)]">{rail}</aside>
    </div>
  );
}

/** One card in the side panel: small title, compact rows. */
export function RailCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-outline-variant bg-surface-container-lowest p-4", className)}>
      <h2 className="mb-3 text-label font-semibold text-on-surface">{title}</h2>
      {children}
    </section>
  );
}

/** Label / value row inside a RailCard. */
export function RailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-label">
      <span className="text-on-surface-variant">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-on-surface">{children}</span>
    </div>
  );
}
