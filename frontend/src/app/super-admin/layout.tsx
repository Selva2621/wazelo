"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Building2, CreditCard,
  LifeBuoy, LogOut, Package, ShieldCheck, ScrollText, Receipt, Activity, Megaphone, Menu, X, BarChart3, Users, TicketPercent,
} from "lucide-react";
import { useSuperAdminAuthStore } from "@/stores/super-admin-auth-store";
import { refreshSuperAdminSession } from "@/lib/api/super-admin-client";
import { superAdminApi } from "@/lib/api/super-admin";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/super-admin/global-search";
import { NotificationBell } from "@/components/super-admin/notification-bell";

const navItems = [
  { href: "/super-admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/super-admin/organizations", icon: Building2, label: "Organizations" },
  { href: "/super-admin/usage", icon: BarChart3, label: "Usage" },
  { href: "/super-admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { href: "/super-admin/billing", icon: Receipt, label: "Billing" },
  { href: "/super-admin/plans", icon: Package, label: "Plans" },
  { href: "/super-admin/coupons", icon: TicketPercent, label: "Coupons" },
  { href: "/super-admin/tickets", icon: LifeBuoy, label: "Help Tickets" },
  { href: "/super-admin/announcements", icon: Megaphone, label: "Announcements" },
  { href: "/super-admin/system", icon: Activity, label: "System Health" },
  { href: "/super-admin/audit-log", icon: ScrollText, label: "Audit Log" },
  { href: "/super-admin/security", icon: ShieldCheck, label: "Security" },
  { href: "/super-admin/team", icon: Users, label: "Team" },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { superAdmin, accessToken, clearAuth } = useSuperAdminAuthStore();
  const [restoring, setRestoring] = useState(true);
  // Phones/tablets: the sidebar is a drawer opened from the top bar
  const [navOpen, setNavOpen] = useState(false);
  const isLoginPage = pathname === "/super-admin/login";

  // Close the drawer after navigating, and on Escape
  useEffect(() => setNavOpen(false), [pathname]);
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  // The access token lives in memory, so a page load starts without one —
  // restore it from the HttpOnly refresh cookie before rendering the portal.
  useEffect(() => {
    if (isLoginPage) return;
    if (accessToken) {
      setRestoring(false);
      return;
    }
    let cancelled = false;
    refreshSuperAdminSession().then((token) => {
      if (cancelled) return;
      if (!token) {
        clearAuth();
        router.replace("/super-admin/login");
        return;
      }
      setRestoring(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoginPage, accessToken, clearAuth, router]);

  const handleLogout = async () => {
    try {
      await superAdminApi.logout();
    } finally {
      clearAuth();
      router.push("/super-admin/login");
    }
  };

  if (isLoginPage) return <>{children}</>;

  if (restoring || !accessToken) return (
    <div className="flex h-screen bg-surface items-center justify-center" role="status">
      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-hidden />
      <span className="sr-only">Loading…</span>
    </div>
  );

  return (
    <div className="flex h-screen bg-surface text-on-surface">
      {/* Backdrop for the mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" aria-hidden onClick={() => setNavOpen(false)} />
      )}

      {/* Sidebar: static from md up, a slide-in drawer below */}
      <aside
        id="sa-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-surface-container-lowest border-r border-outline-variant",
          "transition-transform duration-200 md:static md:z-auto md:w-56 md:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 px-4 h-14 border-b border-outline-variant">
          <img src="/logo/logo.png" alt="Wazelo" className="h-6 w-6 object-contain shrink-0" />
          <span className="font-semibold text-body-lg text-on-surface">
            Wazelo <span className="text-primary">Admin</span>
          </span>
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            aria-label="Close menu"
            className={cn("ml-auto p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container md:hidden", focusRing)}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav aria-label="Super admin" className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-body-lg transition-colors",
                  focusRing,
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-outline-variant px-3 py-3 space-y-2">
          <div className="px-3 py-1">
            <p className="text-label font-medium text-on-surface truncate">{superAdmin?.name ?? "Super Admin"}</p>
            <p className="text-label text-on-surface-variant truncate">{superAdmin?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-body-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors",
              focusRing,
            )}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar: menu button + brand on phones/tablets, global search on every size */}
        <header className="relative z-20 flex items-center gap-2 h-14 px-3 md:px-6 border-b border-outline-variant bg-surface-container-lowest shrink-0">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            aria-expanded={navOpen}
            aria-controls="sa-sidebar"
            className={cn("md:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container", focusRing)}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <img src="/logo/logo.png" alt="" className="md:hidden h-6 w-6 object-contain shrink-0" />
          <span className="hidden sm:inline md:hidden font-semibold text-body-lg text-on-surface shrink-0">
            Wazelo <span className="text-primary">Admin</span>
          </span>
          <div role="search" className="flex-1 min-w-0 md:max-w-md">
            <GlobalSearch />
          </div>
          <div className="ml-auto shrink-0">
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
