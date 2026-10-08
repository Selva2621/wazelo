"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Building2, CreditCard,
  LifeBuoy, LogOut, Package, ShieldCheck, ScrollText, Receipt, Activity, Megaphone,
} from "lucide-react";
import { useSuperAdminAuthStore } from "@/stores/super-admin-auth-store";
import { refreshSuperAdminSession } from "@/lib/api/super-admin-client";
import { superAdminApi } from "@/lib/api/super-admin";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/super-admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/super-admin/organizations", icon: Building2, label: "Organizations" },
  { href: "/super-admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { href: "/super-admin/billing", icon: Receipt, label: "Billing" },
  { href: "/super-admin/plans", icon: Package, label: "Plans" },
  { href: "/super-admin/tickets", icon: LifeBuoy, label: "Help Tickets" },
  { href: "/super-admin/announcements", icon: Megaphone, label: "Announcements" },
  { href: "/super-admin/system", icon: Activity, label: "System Health" },
  { href: "/super-admin/audit-log", icon: ScrollText, label: "Audit Log" },
  { href: "/super-admin/security", icon: ShieldCheck, label: "Security" },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { superAdmin, accessToken, clearAuth } = useSuperAdminAuthStore();
  const [restoring, setRestoring] = useState(true);
  const isLoginPage = pathname === "/super-admin/login";

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
      {/* Sidebar */}
      <aside className="w-56 flex flex-col bg-surface-container-lowest border-r border-outline-variant">
        <div className="flex items-center gap-2 px-4 h-14 border-b border-outline-variant">
          <img src="/logo/logo.png" alt="Wazelo" className="h-6 w-6 object-contain shrink-0" />
          <span className="font-semibold text-body-lg text-on-surface">
            Wazelo <span className="text-primary">Admin</span>
          </span>
        </div>

        <nav aria-label="Super admin" className="flex-1 px-2 py-3 space-y-0.5">
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
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
