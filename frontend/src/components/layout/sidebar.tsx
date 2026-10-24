"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NavItem } from "./nav-item";
import { useNavSections, type NavSectionDef } from "./nav-config";
import { Avatar } from "@/components/ui/avatar";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useLogout } from "@/hooks/use-auth";
import { IconButton } from "@/components/ui/icon-button";

function NavSection({ label, items }: NavSectionDef) {
  return (
    <div className="pt-3">
      <p className="side-label truncate px-4 pb-1 text-label text-on-surface-variant">{label}</p>
      <ul className="pl-2.5">
        {items.map((item) => (
          <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} />
        ))}
      </ul>
    </div>
  );
}

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const mobileOpen = useUIStore((s) => s.mobileSidebarOpen);
  const setMobileOpen = useUIStore((s) => s.setMobileSidebarOpen);
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  // Groups, role/plan/org-type filtering: nav-config.tsx (shared with the mobile More screen)
  const { sections, isFreelancer } = useNavSections();

  const userName = user ? `${user.firstName} ${user.lastName}` : "User";

  // Close the off-canvas drawer on navigation and on Escape.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, setMobileOpen]);

  return (
    <aside
      id="app-sidebar"
      aria-label="Main navigation"
      data-collapsed={collapsed}
      data-open={mobileOpen}
      className={cn(
        "app-sidebar fixed left-0 top-0 z-40 flex h-dvh w-[var(--sidebar-width)] flex-col overflow-hidden bg-sidebar",
        "transition-[width,translate,box-shadow] duration-200 ease-standard",
        "max-lg:-translate-x-full max-lg:data-[open=true]:translate-x-0 max-lg:data-[open=true]:shadow-modal",
      )}
    >
      {/* Brand */}
      <Link
        href={isFreelancer ? "/dashboard/freelancer" : "/dashboard"}
        className="flex h-[var(--header-height)] shrink-0 items-center gap-2.5 px-[22px] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
      >
        <img src="/logo/logo.png" alt="" className="size-7 shrink-0 object-contain" />
        <span className="side-label text-title-sm font-semibold tracking-tight text-on-surface">
          Waze<span className="text-primary-container">lo</span>
        </span>
      </Link>

      {/* Navigation */}
      <nav className="side-scroll flex-1 overflow-y-auto overflow-x-hidden pb-4">
        {sections.map((section) => (
          <NavSection key={section.label} label={section.label} items={section.items} />
        ))}
      </nav>

      {/* Account */}
      <div className="shrink-0 border-t border-outline-variant p-3">
        <div className="flex items-center gap-1">
          <Link
            href="/settings/profile"
            title="Edit profile"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1.5 transition-colors duration-120 ease-standard hover:bg-surface-container-low outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Avatar name={userName} size="sm" className="ml-0.5" />
            <span className="side-label min-w-0 flex-1">
              <span className="block truncate text-body font-medium text-on-surface">{userName}</span>
              <span className="block truncate text-caption font-normal text-on-surface-variant">
                {user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : "User"}
              </span>
            </span>
          </Link>
          <IconButton
            size="sm"
            variant="danger"
            className="side-label"
            onClick={() => logout.mutate()}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
    </aside>
  );
}
