"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Ellipsis, LayoutDashboard, MessageSquare, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { tabForPath, type MobileTabId } from "@/lib/mobile-routes";
import { useUnreadCount } from "@/hooks/use-notifications";
import { useInboxUnreadCount } from "@/hooks/use-mobile-chrome";
import { useOrgSettings } from "@/hooks/use-settings";
import { useMobileStore } from "@/stores/mobile-store";

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
 * iOS tab bar (phones and tablets; hidden from 1024px up). Frosted, fixed to the
 * bottom above the home indicator. Tapping the current tab scrolls back to the top,
 * or returns to the tab's first screen from a detail page.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const hidden = useMobileStore((s) => s.tabBarHiders > 0);
  const { data: org } = useOrgSettings();
  const { data: unread } = useUnreadCount();
  const inboxUnread = useInboxUnreadCount();
  const active = tabForPath(pathname);

  const tabs: TabDef[] = [
    { id: "inbox", href: "/inbox", label: "Inbox", icon: MessageSquare, badge: inboxUnread },
    { id: "contacts", href: "/contacts", label: "Contacts", icon: Users },
    {
      id: "dashboard",
      href: org?.orgType === "FREELANCER" ? "/dashboard/freelancer" : "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    { id: "alerts", href: "/notifications", label: "Alerts", icon: Bell, badge: unread?.unreadCount ?? 0 },
    { id: "more", href: "/more", label: "More", icon: Ellipsis },
  ];

  return (
    <nav
      aria-label="Tabs"
      data-hidden={hidden}
      className="ios-tab-bar fixed inset-x-0 bottom-0 z-30 lg:hidden"
    >
      <ul className="mx-auto flex max-w-2xl">
        {tabs.map((tab) => {
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
                  "flex h-[49px] flex-col items-center justify-center gap-0.5 select-none",
                  "transition-[color,transform] duration-120 ease-standard active:scale-[0.92]",
                  isActive ? "text-primary" : "text-on-surface-variant",
                )}
              >
                <span className="relative">
                  <Icon className="h-[25px] w-[25px]" strokeWidth={isActive ? 2.3 : 1.8} aria-hidden />
                  {tab.badge !== undefined && <Badge count={tab.badge} />}
                </span>
                <span className={cn("text-[10.5px] leading-none tracking-[0.01em]", isActive ? "font-semibold" : "font-medium")}>
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
