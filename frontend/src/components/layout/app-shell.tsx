"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { motionTokens } from "@/lib/motion-tokens";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { PageTransition } from "./page-transition";
import { useUIStore } from "@/stores/ui-store";

interface AppShellProps {
  children: ReactNode;
  fullHeight?: boolean;
}

export function AppShell({ children, fullHeight }: AppShellProps) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const mobileOpen = useUIStore((s) => s.mobileSidebarOpen);
  const setMobileOpen = useUIStore((s) => s.setMobileSidebarOpen);

  // Header turns solid once content scrolls beneath it.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const offset = collapsed ? "lg:ml-[var(--sidebar-collapsed)]" : "lg:ml-[var(--sidebar-width)]";

  return (
    <div className="app-canvas relative min-h-dvh bg-surface">
      <div ref={sentinelRef} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" />
      <Sidebar />
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            aria-hidden
            className="fixed inset-0 z-30 bg-scrim lg:hidden"
            onClick={() => setMobileOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: motionTokens.duration.base } }}
            exit={{ opacity: 0, transition: { duration: motionTokens.duration.fast } }}
          />
        )}
      </AnimatePresence>
      <Header scrolled={scrolled} offsetClassName={offset} />
      <main
        className={cn(
          "app-main transition-[margin-left] duration-200 ease-standard",
          offset,
          fullHeight && "h-[calc(100dvh-var(--header-height))]",
        )}
      >
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
