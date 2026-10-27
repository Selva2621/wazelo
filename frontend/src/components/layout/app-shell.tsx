"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { motionTokens } from "@/lib/motion-tokens";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { PageTransition } from "./page-transition";
import { useUIStore } from "@/stores/ui-store";
import { useMobileStore } from "@/stores/mobile-store";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MobileNavBar } from "@/components/mobile/mobile-nav-bar";
import { MobileTabBar } from "@/components/mobile/mobile-tab-bar";
import { MobileTableLabels } from "@/components/mobile/mobile-table-labels";
import { PullToRefresh } from "@/components/mobile/pull-to-refresh";
import { EdgeSwipeBack } from "@/components/mobile/edge-swipe-back";

interface AppShellProps {
  children: ReactNode;
  fullHeight?: boolean;
}

export function AppShell({ children, fullHeight }: AppShellProps) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const mobileOpen = useUIStore((s) => s.mobileSidebarOpen);
  const setMobileOpen = useUIStore((s) => s.setMobileSidebarOpen);
  const isMobile = useIsMobile();
  const tabBarHidden = useMobileStore((s) => s.tabBarHiders > 0);

  // Lets CSS drop the tab bar's space while a screen hides it (open chat, editors)
  useEffect(() => {
    document.documentElement.toggleAttribute("data-tabbar-hidden", tabBarHidden);
  }, [tabBarHidden]);

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

  // One title per screen: most pages render their own <h1>, so the header shows the title
  // only when the page has none, or once that heading has scrolled out of view.
  const mainRef = useRef<HTMLElement>(null);
  const [pageHeading, setPageHeading] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const find = () => setPageHeading(main.querySelector<HTMLElement>("h1"));
    const frame = requestAnimationFrame(find);
    const mo = new MutationObserver(find);
    mo.observe(main, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
    };
  }, []);
  const [headingInView, setHeadingInView] = useState(false);
  useEffect(() => {
    if (!pageHeading) return;
    const io = new IntersectionObserver(([entry]) => setHeadingInView(entry.isIntersecting), {
      rootMargin: "-64px 0px 0px 0px",
    });
    io.observe(pageHeading);
    return () => io.disconnect();
  }, [pageHeading]);

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
      <Header
        scrolled={scrolled}
        offsetClassName={offset}
        pageHasHeading={pageHeading !== null}
        showTitle={!pageHeading || !headingInView}
      />
      {/* Phones and tablets: iOS nav bar + tab bar (the desktop header is hidden by CSS there) */}
      {isMobile && (
        // Suspense: the nav bar reads search params (settings sections)
        <Suspense fallback={null}>
          <MobileNavBar />
        </Suspense>
      )}
      <main
        ref={mainRef}
        className={cn(
          "app-main transition-[margin-left] duration-200 ease-standard",
          offset,
          fullHeight && "h-[calc(100dvh-var(--header-height))]",
        )}
      >
        <PageTransition>{children}</PageTransition>
      </main>
      {isMobile && <MobileTabBar />}
      {isMobile && <MobileTableLabels />}
      {isMobile && <PullToRefresh />}
      {isMobile && <EdgeSwipeBack />}
    </div>
  );
}
