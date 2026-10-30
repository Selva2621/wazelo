"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Ellipsis, House, MessageSquare, Plus, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { usePlatform } from "@/lib/platform";
import { tabForPath, type MobileTabId } from "@/lib/mobile-routes";
import { useInboxUnreadCount } from "@/hooks/use-mobile-chrome";
import { useOrgSettings } from "@/hooks/use-settings";
import { useMobileStore } from "@/stores/mobile-store";
import { BottomSheet } from "@/components/ios/bottom-sheet";
import { ShortcutGrid } from "@/components/mobile/shortcut-grid";

interface TabDef {
  id: MobileTabId;
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-2.5 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 text-[11px] font-semibold leading-none tabular-nums text-on-error">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * Mobile tab bar (phones and tablets; hidden from 1024px up):
 * Home · Inbox · [+] · Contacts · More. The raised centre button opens every page as
 * app icons in a sheet. Tapping the current tab scrolls back to the top, or returns to
 * the tab's first screen from a detail page. Notifications live in the top bar (bell).
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const hidden = useMobileStore((s) => s.tabBarHiders > 0);
  const { data: org } = useOrgSettings();
  const inboxUnread = useInboxUnreadCount();
  const active = tabForPath(pathname);
  const android = usePlatform() === "android";
  // The page the apps sheet was opened on: going anywhere else closes it by itself
  const [appsOpenOn, setAppsOpenOn] = useState<string | null>(null);
  const appsOpen = appsOpenOn === pathname;

  const home = org?.orgType === "FREELANCER" ? "/dashboard/freelancer" : "/dashboard";
  const left: TabDef[] = [
    { id: "home", href: home, label: "Home", icon: House },
    { id: "inbox", href: "/inbox", label: "Inbox", icon: MessageSquare, badge: inboxUnread },
  ];
  const right: TabDef[] = [
    { id: "contacts", href: "/contacts", label: "Contacts", icon: Users },
    { id: "more", href: "/more", label: "More", icon: Ellipsis },
  ];

  const renderTab = (tab: TabDef) => {
    const isActive = active === tab.id;
    const Icon = tab.icon;
    return (
      <li key={tab.id} className="flex-1">
        <Link
          href={tab.href}
          aria-current={isActive ? "page" : undefined}
          onClick={(e) => {
            haptic();
            if (pathname === tab.href) {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            } else if (isActive) {
              // From a detail page: back to the tab's first screen
              e.preventDefault();
              router.push(tab.href);
            }
          }}
          className={cn(
            android
              ? // Material 3 navigation bar item: pill indicator behind the icon, label below
                "m3-nav-item flex h-[var(--tabbar-item-h)] flex-col items-center justify-center gap-1 select-none"
              : "flex h-[var(--tabbar-item-h)] flex-col items-center justify-center gap-1 select-none transition-[color,transform] duration-120 ease-standard active:scale-[0.92]",
            android
              ? isActive
                ? "text-on-surface"
                : "text-on-surface-variant"
              : isActive
                ? "text-primary"
                : "text-on-surface-variant",
          )}
        >
          {android ? (
            <span className="m3-nav-indicator" data-active={isActive}>
              <Icon className="h-[26px] w-[26px]" strokeWidth={isActive ? 2.2 : 1.8} aria-hidden />
              {tab.badge !== undefined && <Badge count={tab.badge} />}
            </span>
          ) : (
            <span className="relative">
              <Icon className="h-7 w-7" strokeWidth={isActive ? 2.2 : 1.8} aria-hidden />
              {tab.badge !== undefined && <Badge count={tab.badge} />}
            </span>
          )}
          <span
            className={cn(
              android ? "text-[13px] leading-4 tracking-[0.02em]" : "text-[12px] leading-none tracking-[0.01em]",
              isActive ? (android ? "font-bold" : "font-semibold") : "font-medium",
            )}
          >
            {tab.label}
            {tab.badge ? <span className="sr-only">, {tab.badge} unread</span> : null}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <>
      <nav aria-label="Tabs" data-hidden={hidden} className="ios-tab-bar fixed inset-x-0 bottom-0 z-30 lg:hidden">
        <ul className="mx-auto flex max-w-2xl">
          {left.map(renderTab)}

          {/* Centre: all apps */}
          <li className="flex flex-1 justify-center">
            {/* Raised circle with its label under it, like the other tabs; one tap target */}
            <button
              type="button"
              onClick={() => {
                haptic();
                setAppsOpenOn(appsOpen ? null : pathname);
              }}
              aria-haspopup="dialog"
              aria-expanded={appsOpen}
              className="tab-fab-button flex h-[var(--tabbar-item-h)] flex-col items-center justify-between select-none"
            >
              <span data-open={appsOpen} className={cn("tab-fab", android && "tab-fab-android")}>
                <span className="tab-fab-halo" aria-hidden />
                <Plus className="tab-fab-icon" strokeWidth={2.4} aria-hidden />
              </span>
              <span
                className={cn(
                  "font-semibold text-primary",
                  android ? "pb-4 text-[13px] leading-4 tracking-[0.02em]" : "pb-[9px] text-[12px] leading-none tracking-[0.01em]",
                )}
              >
                Apps
              </span>
            </button>
          </li>

          {right.map(renderTab)}
        </ul>
      </nav>

      <BottomSheet open={appsOpen} onClose={() => setAppsOpenOn(null)} title="Apps" maxHeight={0.85}>
        <ShortcutGrid inSheet onNavigate={() => setAppsOpenOn(null)} />
      </BottomSheet>
    </>
  );
}
