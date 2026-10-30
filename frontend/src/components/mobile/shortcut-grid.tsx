"use client";

import Link from "next/link";
import { useNavSections, type NavSectionDef } from "@/components/layout/nav-config";
import { AppIcon } from "@/components/mobile/app-icons";
import { useInboxUnreadCount } from "@/hooks/use-mobile-chrome";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type Shortcut = Pick<NavSectionDef["items"][number], "href" | "label" | "icon" | "countKey">;

/** The dashboard itself is where the grid lives, so it is not a shortcut */
const SKIP = ["/dashboard", "/dashboard/freelancer"];

/**
 * Phone home screen for the Dashboard (phones and tablets only): every menu the user
 * can open, as app icons, in sidebar order. Same pages and links as the sidebar / More.
 */
export function ShortcutGrid({
  className,
  inSheet,
  onNavigate,
}: {
  className?: string;
  /** Drawn inside the apps sheet: no card of its own */
  inSheet?: boolean;
  /** Called when a shortcut is tapped (the sheet closes itself) */
  onNavigate?: () => void;
}) {
  const { sections } = useNavSections();
  const inboxUnread = useInboxUnreadCount();

  const shortcuts: Shortcut[] = sections.flatMap((section) =>
    section.items.filter((item) => !SKIP.includes(item.href)),
  );

  if (shortcuts.length === 0) return null;

  return (
    <nav
      aria-label="Apps"
      className={cn(inSheet ? "px-2 pb-2 pt-1" : "rounded-2xl bg-surface-container-lowest px-2 py-4", "lg:hidden", className)}
    >
      <ul className="grid grid-cols-4 gap-y-4 sm:grid-cols-6">
        {shortcuts.map((s) => {
          const badge = s.countKey === "inbox" ? inboxUnread : 0;
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                onClick={() => {
                  haptic();
                  onNavigate?.();
                }}
                className="group flex flex-col items-center gap-1.5 rounded-xl px-0.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <span className="relative transition-transform duration-120 ease-standard group-active:scale-[0.92]">
                  <AppIcon href={s.href} fallback={s.icon} />
                  {badge > 0 && (
                    <span
                      aria-hidden
                      className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[11px] font-semibold tabular-nums text-on-error ring-2 ring-surface-container-lowest"
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
                <span className="line-clamp-2 w-full text-center text-[12px] font-medium leading-[15px] text-on-surface">
                  {s.label}
                  {badge > 0 && <span className="sr-only">, {badge} unread</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
