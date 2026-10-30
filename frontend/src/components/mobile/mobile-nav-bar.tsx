"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bell, ChevronLeft, Search } from "lucide-react";
import { useUnreadCount } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { usePlatform } from "@/lib/platform";
import { useProductTerms } from "@/lib/product-terms";
import { hasLargeTitle, isTabRoot, parentRoute, routeTitle } from "@/lib/mobile-routes";
import { useMobileStore } from "@/stores/mobile-store";
import { useUIStore } from "@/stores/ui-store";
import { CommandPalette } from "@/components/layout/command-palette";
import { MobileTourButton } from "@/components/tour/tour-help-button";

const COLLAPSE_AT = 36;

/** Notifications, with the unread count, in the top bar of the main screens */
function AlertsBell({ count, className, iconClassName }: { count: number; className: string; iconClassName: string }) {
  return (
    <Link
      href="/notifications"
      data-tour="m-bell"
      onClick={() => haptic()}
      className={cn("relative", className)}
      aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
    >
      <Bell className={iconClassName} strokeWidth={2} aria-hidden />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute right-1 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-error px-1 text-[10.5px] font-semibold leading-none tabular-nums text-on-error ring-2 ring-surface"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

function shortLabel(label: string) {
  return label.length > 12 ? "Back" : label;
}

/**
 * iOS navigation bar (phones and tablets; hidden from 1024px up).
 * List pages: a large title under the bar that scrolls away, after which the small
 * centred title fades in. Detail pages: compact bar with a Back button.
 * Pages add their own buttons on the right with <MobileNavActions>.
 */
export function MobileNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const pageTitle = useUIStore((s) => s.pageTitle);
  const history = useMobileStore((s) => s.history);
  const visit = useMobileStore((s) => s.visit);
  const titlePath = useMobileStore((s) => s.titlePath);
  const setTitlePath = useMobileStore((s) => s.setTitlePath);
  const titleOverride = useMobileStore((s) => s.titleOverride);
  const setActionsSlot = useMobileStore((s) => s.setActionsSlot);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: unread } = useUnreadCount();
  const alertCount = unread?.unreadCount ?? 0;
  // Freelancers call the catalogue "Services"; the shared route titles say "Products"
  const terms = useProductTerms();
  const navTitle = (path: string) => (path === "/settings/products" ? terms.Plural : routeTitle(path));

  // /settings?tab=x is a section screen of the Settings list (same pathname)
  const searchParams = useSearchParams();
  const settingsSection = pathname === "/settings" && searchParams.has("tab");
  const platform = usePlatform();
  const android = platform === "android";
  // Material top app bars keep the title in the bar; only iOS has the large title
  const large = !android && hasLargeTitle(pathname) && !settingsSection;
  const root = isTabRoot(pathname);

  // Session history for Back
  useEffect(() => {
    visit(pathname);
  }, [pathname, visit]);

  // A page title belongs to the page that set it; pages without one fall back to the route title
  useEffect(() => {
    setTitlePath(pathname);
    // Only when the title changes, not on every navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageTitle, setTitlePath]);

  const title =
    titleOverride?.path === pathname
      ? titleOverride.title
      : titlePath === pathname && pageTitle
        ? pageTitle
        : navTitle(pathname);

  // Large title collapses once it scrolls under the bar
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > (large ? COLLAPSE_AT : 0)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [large, pathname]);

  // Lets CSS size full-height pages around the bars (see --header-height in globals.css)
  useEffect(() => {
    document.documentElement.toggleAttribute("data-large-title", large);
    return () => document.documentElement.removeAttribute("data-large-title");
  }, [large]);

  const previous = history.length > 1 ? history[history.length - 2] : null;
  const parent = parentRoute(pathname);
  const backLabel = settingsSection ? "Settings" : shortLabel(previous ? navTitle(previous) : parent.label);

  const goBack = () => {
    haptic();
    if (settingsSection) router.push("/settings");
    else if (previous) router.back();
    else router.push(parent.href);
  };

  const showCompactTitle = !large || scrolled;

  if (android) {
    // Material 3 small top app bar: ← and a left-aligned title; turns tonal once content scrolls under
    return (
      <>
        <div className="ios-nav-bar m3-top-app-bar sticky top-0 z-20 lg:hidden" data-scrolled={scrolled}>
          <div className="flex h-[var(--mobile-nav-h)] items-center gap-1 px-1">
            {!root && (
              <button
                type="button"
                onClick={goBack}
                className="m3-icon-button text-on-surface"
                aria-label={`Back to ${backLabel}`}
              >
                <ArrowLeft className="h-6 w-6" strokeWidth={2} aria-hidden />
              </button>
            )}
            <h1
              className={cn(
                "min-w-0 flex-1 truncate text-[22px] font-normal leading-7 text-on-surface",
                root ? "pl-3" : "pl-1",
              )}
            >
              {title}
            </h1>
            <div className="flex shrink-0 items-center">
              <MobileTourButton android />
              <div ref={setActionsSlot} className="flex items-center empty:hidden" />
              {root && <AlertsBell count={alertCount} className="m3-icon-button text-on-surface-variant" iconClassName="h-6 w-6" />}
              {root && (
                <button
                  type="button"
                  data-tour="m-search"
                  onClick={() => setSearchOpen(true)}
                  className="m3-icon-button text-on-surface-variant"
                  aria-label="Search"
                >
                  <Search className="h-6 w-6" strokeWidth={2} aria-hidden />
                </button>
              )}
            </div>
          </div>
        </div>
        <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div className="ios-nav-bar sticky top-0 z-20 lg:hidden" data-scrolled={scrolled}>
        {/* Three columns: the sides share the leftover width, so a long title truncates
            instead of running under the Back label */}
        <div className="grid h-[var(--mobile-nav-h)] grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,1fr)] items-center gap-1 px-2">
          {/* Left: Back */}
          <div className="flex min-w-0 items-center">
            {!root && (
              <button
                type="button"
                onClick={goBack}
                className="-ml-0.5 flex h-11 min-w-11 max-w-full items-center pr-2 text-primary active:opacity-50"
                aria-label={`Back to ${backLabel}`}
              >
                <ChevronLeft className="h-7 w-7 shrink-0" strokeWidth={2.2} aria-hidden />
                <span className="-ml-0.5 truncate text-[17px] leading-none">{backLabel}</span>
              </button>
            )}
          </div>

          {/* Centre: compact title (tap to scroll to top, like tapping the status bar) */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            tabIndex={-1}
            aria-hidden={!showCompactTitle}
            className={cn(
              "min-w-0 max-w-[60vw] truncate text-center text-[17px] font-semibold text-on-surface",
              "transition-opacity duration-200 ease-standard",
              showCompactTitle ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {title}
          </button>

          {/* Right: page actions + search on top-level pages */}
          <div className="flex min-w-0 items-center justify-end gap-0.5">
            <MobileTourButton android={false} />
            <div ref={setActionsSlot} className="flex items-center gap-0.5 empty:hidden" />
            {root && (
              <AlertsBell
                count={alertCount}
                className="grid size-11 place-items-center rounded-full text-primary active:opacity-50"
                iconClassName="h-[22px] w-[22px]"
              />
            )}
            {root && (
              <button
                type="button"
                data-tour="m-search"
                onClick={() => setSearchOpen(true)}
                className="grid size-11 place-items-center rounded-full text-primary active:opacity-50"
                aria-label="Search"
              >
                <Search className="h-[22px] w-[22px]" strokeWidth={2.1} aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>

      {large && (
        <div className="ios-large-title lg:hidden">
          <h1 className="truncate">{title}</h1>
        </div>
      )}

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
