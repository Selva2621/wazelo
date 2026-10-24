"use client";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";

// Rough shape of the nav: group label + items, so the real sidebar lands without a jump.
const NAV_SHAPE = [2, 1, 4, 3];

/**
 * Static frame of the app (sidebar + header) shown while the session is being restored on a
 * hard reload. The nav can't render yet (it depends on the user's role and org features), so
 * this draws the same geometry with quiet placeholders instead of a spinner or a blank page.
 */
export function AppShellSkeleton() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const offset = collapsed ? "lg:ml-[var(--sidebar-collapsed)]" : "lg:ml-[var(--sidebar-width)]";

  return (
    <div className="app-canvas relative min-h-dvh bg-surface" aria-busy="true" aria-label="Loading workspace">
      <aside
        aria-hidden
        data-collapsed={collapsed}
        className="app-sidebar fixed left-0 top-0 z-40 flex h-dvh w-[var(--sidebar-width)] flex-col overflow-hidden bg-sidebar max-lg:hidden"
      >
        <div className="flex h-[var(--header-height)] shrink-0 items-center gap-2.5 px-[22px]">
          <img src="/logo/logo.png" alt="" className="size-7 shrink-0 object-contain" />
          <span className="side-label text-title-sm font-semibold tracking-tight text-on-surface">
            Waze<span className="text-primary-container">lo</span>
          </span>
        </div>
        <div className="flex-1 space-y-6 px-4 pt-2">
          {NAV_SHAPE.map((count, g) => (
            <div key={g} className="space-y-3">
              <div className="side-label h-2.5 w-16 rounded-full bg-on-surface/8" />
              {Array.from({ length: count }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="size-9 shrink-0 rounded-xl bg-on-surface/6" />
                  <div className="side-label h-3 flex-1 rounded-full bg-on-surface/6" style={{ maxWidth: `${55 + ((g + i) % 3) * 15}%` }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Phones and tablets: iOS nav bar, large title and tab bar placeholders */}
      <div aria-hidden className="lg:hidden">
        <div className="ios-nav-bar flex justify-end px-4" style={{ height: "calc(44px + var(--safe-top))" }}>
          <div className="mt-auto mb-2.5 size-6 rounded-full bg-on-surface/6" />
        </div>
        <div className="ios-large-title flex items-center">
          <div className="h-8 w-40 rounded-lg bg-on-surface/8" />
        </div>
        <div className="space-y-3 px-4 pt-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="size-11 shrink-0 rounded-full bg-on-surface/6" />
              <div className="flex-1 space-y-2">
                <div className="h-3 rounded-full bg-on-surface/8" style={{ width: `${45 + (i % 3) * 15}%` }} />
                <div className="h-2.5 w-3/4 rounded-full bg-on-surface/5" />
              </div>
            </div>
          ))}
        </div>
        <div className="ios-tab-bar fixed inset-x-0 bottom-0 flex h-[calc(49px+var(--safe-bottom))] justify-around pt-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="size-6 rounded-md bg-on-surface/6" />
          ))}
        </div>
      </div>

      <header
        aria-hidden
        className={cn("flex h-[var(--header-height)] items-center gap-3 px-4 max-lg:hidden lg:px-6", offset)}
      >
        <div className="size-9 rounded-lg bg-on-surface/6" />
        <div className="h-3.5 w-28 rounded-full bg-on-surface/8" />
        <div className="ml-auto hidden h-10 w-full max-w-sm rounded-full bg-on-surface/5 md:block" />
        <div className="ml-auto size-9 rounded-full bg-on-surface/6 md:ml-0" />
        <div className="size-10 rounded-full bg-on-surface/6" />
      </header>
    </div>
  );
}
