"use client";

import { useState, useEffect, useRef } from "react";
import { User, LogOut, Sparkles, CreditCard, Search, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { motionTokens, springs } from "@/lib/motion-tokens";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";
import { ThemeCycleButton, ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { CommandPalette } from "./command-palette";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { useLogout } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-billing";
import type { SubscriptionStatus } from "@/lib/types/billing";

const statusBadgeStyles: Record<SubscriptionStatus, string> = {
  ACTIVE:       "bg-success-container text-success",
  TRIAL:        "bg-primary/15 text-primary-container",
  GRACE_PERIOD: "bg-warning-container text-warning",
  PAST_DUE:     "bg-warning-container text-warning",
  EXPIRED:      "bg-error-container text-error",
  CANCELLED:    "bg-surface-container-high text-on-surface-variant",
};

interface HeaderProps {
  /** True once page content has scrolled under the header. */
  scrolled?: boolean;
  /** Left offset matching the sidebar width (lg and up). */
  offsetClassName?: string;
}

export function Header({ scrolled = false, offsetClassName }: HeaderProps) {
  const user = useAuthStore((s) => s.user);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setMobileOpen = useUIStore((s) => s.setMobileSidebarOpen);
  const pageTitle = useUIStore((s) => s.pageTitle);
  const userName = user ? `${user.firstName} ${user.lastName}` : "User";

  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const logout = useLogout();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: billingData } = useSubscription({ enabled: isAuthenticated });
  const aiCredits = billingData?.usage?.aiCredits;
  const subscription = billingData?.subscription;

  const aiPillColor =
    !aiCredits
      ? null
      : aiCredits.percentUsed >= 100
      ? "bg-error-container text-error border-error/20"
      : aiCredits.percentUsed >= 80
      ? "bg-warning-container text-warning border-warning/20"
      : "bg-success-container text-success border-success/20";

  // Global ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close account menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={cn(
          "app-header sticky top-0 z-20 flex h-[var(--header-height)] items-center gap-2 border-b px-4 backdrop-blur-md lg:gap-3 lg:px-6",
          "transition-[margin-left,background-color,border-color] duration-200 ease-standard",
          scrolled ? "border-outline-variant bg-surface/85" : "border-transparent bg-surface/60",
          offsetClassName,
        )}
      >
        <IconButton
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          aria-controls="app-sidebar"
        >
          <Menu className="h-5 w-5" />
        </IconButton>
        <IconButton
          className="hidden lg:inline-flex"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar to icons"}
          aria-pressed={collapsed}
          aria-controls="app-sidebar"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </IconButton>

        <h1 className="min-w-0 truncate text-title-sm font-semibold text-on-surface">{pageTitle}</h1>

        {/* Search: opens the command palette */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className={cn(
            "ml-auto hidden h-10 w-full max-w-sm items-center gap-2.5 rounded-full border border-outline-variant bg-surface-container-low px-4 text-body text-placeholder md:flex",
            "transition-[border-color,background-color] duration-120 ease-standard hover:border-outline hover:bg-surface-container",
            "outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-on-surface-variant" />
          <span className="flex-1 truncate text-left">Search contacts, chats, campaigns…</span>
          <kbd className="rounded border border-outline-variant bg-surface-container px-1.5 py-0.5 font-mono text-caption font-normal text-on-surface-variant">
            ⌘K
          </kbd>
        </button>
        <IconButton className="ml-auto md:hidden" onClick={() => setSearchOpen(true)} aria-label="Search">
          <Search className="h-5 w-5" />
        </IconButton>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-2">
          {aiPillColor && aiCredits && (
            <Link
              href="/settings/billing"
              className={cn(
                "hidden h-10 items-center gap-1.5 rounded-full border px-3 text-label font-medium transition-opacity hover:opacity-80 sm:flex",
                aiPillColor,
              )}
              title={`${aiCredits.current} of ${aiCredits.limit} AI credits used`}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="tabular-nums">
                {aiCredits.current} / {aiCredits.limit}
                <span className="ml-1 hidden xl:inline">AI credits</span>
              </span>
            </Link>
          )}

          <ThemeCycleButton />

          <NotificationCenter />

          {/* Account menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="grid size-10 place-items-center rounded-full bg-surface-container-low transition-colors duration-120 ease-standard hover:bg-surface-container outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <Avatar name={userName} size="sm" />
            </button>

            <AnimatePresence>
            {menuOpen && (
              <motion.div
                role="menu"
                className="absolute right-0 top-full z-40 mt-2 w-60 origin-top-right overflow-hidden rounded-xl bg-surface-container shadow-popover"
                initial={{ opacity: 0, scale: 0.96, y: -motionTokens.distance.sm }}
                animate={{ opacity: 1, scale: 1, y: 0, transition: springs.snappy }}
                exit={{ opacity: 0, scale: 0.98, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.exit } }}
              >
                <div className="border-b border-outline-variant px-4 py-3">
                  <p className="truncate text-body font-medium text-on-surface">{userName}</p>
                  <p className="truncate text-caption font-normal text-on-surface-variant">{user?.email}</p>
                </div>

                {subscription && (
                  <div className="flex items-center justify-between gap-2 border-b border-outline-variant px-4 py-2.5">
                    <span className="truncate text-label text-on-surface-variant">{subscription.plan.name}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-caption",
                        statusBadgeStyles[subscription.status],
                      )}
                    >
                      {subscription.status === "GRACE_PERIOD"
                        ? "Grace"
                        : subscription.status.charAt(0) + subscription.status.slice(1).toLowerCase().replace("_", " ")}
                    </span>
                  </div>
                )}

                <div className="border-b border-outline-variant px-3 py-2.5">
                  <p className="mb-1.5 px-1 text-label text-on-surface-variant">Appearance</p>
                  <ThemeToggle />
                </div>

                <div className="p-1">
                  <Link
                    role="menuitem"
                    href="/settings/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-body text-on-surface transition-colors hover:bg-surface-container-high"
                  >
                    <User className="h-4 w-4 text-on-surface-variant" />
                    My profile
                  </Link>
                  <Link
                    role="menuitem"
                    href="/settings/billing"
                    onClick={() => setMenuOpen(false)}
                    className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-body text-on-surface transition-colors hover:bg-surface-container-high"
                  >
                    <CreditCard className="h-4 w-4 text-on-surface-variant" />
                    Billing &amp; plan
                  </Link>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      logout.mutate();
                    }}
                    className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-body text-error transition-colors hover:bg-error/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
