"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Flame, LayoutDashboard, Building2, CreditCard,
  LifeBuoy, LogOut, Package,
} from "lucide-react";
import { useSuperAdminAuthStore, getCookie } from "@/stores/super-admin-auth-store";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/super-admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/super-admin/organizations", icon: Building2, label: "Organizations" },
  { href: "/super-admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { href: "/super-admin/plans", icon: Package, label: "Plans" },
  { href: "/super-admin/tickets", icon: LifeBuoy, label: "Help Tickets" },
];

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { superAdmin, clearAuth } = useSuperAdminAuthStore();
  const [token, setToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Read cookie client-side after mount — document is available here
    const t = getCookie("sa_token");
    setToken(t);
    setChecked(true);
  }, []);

  useEffect(() => {
    if (!checked) return;
    if (pathname === "/super-admin/login") return;
    if (!token) {
      router.push("/super-admin/login");
    }
  }, [checked, token, pathname, router]);

  const handleLogout = () => {
    clearAuth();
    setToken(null);
    router.push("/super-admin/login");
  };

  if (pathname === "/super-admin/login") return <>{children}</>;

  if (!checked || !token) return (
    <div className="flex h-screen bg-surface items-center justify-center">
      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex h-screen bg-surface text-on-surface">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col bg-surface-container-lowest border-r border-outline-variant">
        <div className="flex items-center gap-2 px-4 h-14 border-b border-outline-variant">
          <Flame className="h-5 w-5 text-primary shrink-0" />
          <span className="font-bold text-sm text-on-surface">
            Wazelo <span className="text-primary">Admin</span>
          </span>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname.startsWith(href)
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-outline-variant px-3 py-3 space-y-2">
          <div className="px-3 py-1">
            <p className="text-xs font-medium text-on-surface truncate">{superAdmin?.name ?? "Super Admin"}</p>
            <p className="text-xs text-on-surface-variant truncate">{superAdmin?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors"
          >
            <LogOut className="h-4 w-4" />
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
