"use client";

import { useState, useEffect, useRef } from "react";
import { User, LogOut, Sparkles, CreditCard } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui/search-input";
import { Avatar } from "@/components/ui/avatar";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { CommandPalette } from "./command-palette";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { useLogout } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-billing";
import type { SubscriptionStatus } from "@/lib/types/billing";

const statusBadgeStyles: Record<SubscriptionStatus, string> = {
  ACTIVE:       "bg-success-container text-success",
  TRIAL:        "bg-primary/15 text-primary",
  GRACE_PERIOD: "bg-warning-container text-warning",
  PAST_DUE:     "bg-warning-container text-warning",
  EXPIRED:      "bg-error-container text-error",
  CANCELLED:    "bg-surface-container-high text-on-surface-variant",
};

export function Header() {
  const user = useAuthStore((s) => s.user);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const pageTitle = useUIStore((s) => s.pageTitle);
  const userName = user
    ? `${user.firstName} ${user.lastName}`
    : "User";

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

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-20 flex h-[var(--header-height)] items-center gap-4 bg-surface-container-lowest px-6 transition-[margin-left] duration-200 ease-in-out",
          collapsed
            ? "ml-[var(--sidebar-collapsed)]"
            : "ml-[var(--sidebar-width)]",
        )}
      >
        {/* Page title */}
        <h1 className="text-[18px] font-semibold text-on-surface shrink-0">
          {pageTitle}
        </h1>

        {/* Search — opens command palette on click */}
        <div className="flex-1 max-w-md mx-auto">
          <div onClick={() => setSearchOpen(true)} className="cursor-pointer">
            <SearchInput
              placeholder="Search..."
              shortcutHint="⌘K"
              readOnly
              className="pointer-events-none"
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3 shrink-0">
          <NotificationCenter />

          {/* AI Credits Pill */}
          {aiPillColor && aiCredits && (
            <Link
              href="/settings/billing"
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-opacity hover:opacity-80",
                aiPillColor,
              )}
              title={`${aiCredits.current} of ${aiCredits.limit} AI credits used`}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>
                {aiCredits.current} / {aiCredits.limit}
                <span className="ml-1 hidden sm:inline">AI credits</span>
              </span>
            </Link>
          )}

          {/* Avatar + Dropdown Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <Avatar name={userName} size="sm" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-surface-container-lowest border border-outline-variant/15 shadow-xl overflow-hidden z-50">
                {/* User info */}
                <div className="px-4 py-3 border-b border-outline-variant/10">
                  <p className="text-[13px] font-medium text-on-surface truncate">
                    {userName}
                  </p>
                  <p className="text-[11px] text-on-surface-variant/60 truncate">
                    {user?.email}
                  </p>
                </div>

                {/* Subscription plan */}
                {subscription && (
                  <div className="px-4 py-2.5 border-b border-outline-variant/10">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] text-on-surface-variant/70 truncate">
                        {subscription.plan.name}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          statusBadgeStyles[subscription.status],
                        )}
                      >
                        {subscription.status === "GRACE_PERIOD" ? "Grace" : subscription.status}
                      </span>
                    </div>
                  </div>
                )}

                {/* Menu items */}
                <div className="py-1">
                  <a
                    href="/settings/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <User className="h-4 w-4 text-on-surface-variant/60" />
                    My Profile
                  </a>
                  <Link
                    href="/settings/billing"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <CreditCard className="h-4 w-4 text-on-surface-variant/60" />
                    Billing &amp; Plan
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout.mutate();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-error hover:bg-error/5 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Command Palette */}
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
