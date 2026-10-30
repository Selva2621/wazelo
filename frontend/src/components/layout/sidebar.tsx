"use client";

import { CreditCard, LogOut, MoreVertical, PanelLeftClose, PanelLeftOpen, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { motionTokens, springs } from "@/lib/motion-tokens";
import { NavGroup, NavItem } from "./nav-item";
import { NAV_PARENTS, useNavSections, type NavSectionDef } from "./nav-config";
import { Avatar } from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useLogout } from "@/hooks/use-auth";
import { useOrgSettings } from "@/hooks/use-settings";
import { useAiCredits } from "@/hooks/use-ai-credits";
import { useContacts } from "@/hooks/use-contacts";
import { useInboxUnreadCount } from "@/hooks/use-mobile-chrome";

type Counts = { inbox: number; contacts?: number };

/** One section: label (a divider in the collapsed rail), then rows; items sharing a parent fold into a group. */
function NavSection({ label, items, counts }: NavSectionDef & { counts: Counts }) {
  const rows: ReactNode[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.parent) {
      const group = [item];
      while (items[i + 1]?.parent === item.parent) group.push(items[++i]);
      if (group.length > 1) {
        const meta = NAV_PARENTS[item.parent];
        rows.push(
          <NavGroup
            key={item.parent}
            label={meta.label}
            icon={meta.icon}
            items={group.map((g) => ({ href: g.href, label: g.childLabel ?? g.label }))}
          />,
        );
        continue;
      }
    }
    const count = item.countKey ? counts[item.countKey] : undefined;
    rows.push(
      <NavItem
        key={item.href}
        href={item.href}
        icon={item.icon}
        label={item.label}
        count={count}
        highlight={item.countKey === "inbox"}
      />,
    );
  }
  return (
    <div className="pt-4 first:pt-1">
      <p className="side-label truncate px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--side-faint)]">
        {label}
      </p>
      <div aria-hidden className="side-divider" />
      <ul className="space-y-0.5">{rows}</ul>
    </div>
  );
}

/** Credits left this period, with a bar for how much of the plan is used. */
function AiCreditsWidget() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data } = useAiCredits({ enabled: isAuthenticated });
  const wallet = data?.wallet;
  if (!wallet) return null;

  const { plan, purchased, available } = wallet;
  const pct = plan.unlimited || plan.limit <= 0 ? 0 : Math.min(100, (plan.used / plan.limit) * 100);
  const low = !plan.unlimited && pct >= 80 && purchased === 0;

  return (
    <Link
      href="/settings/ai-credits"
      data-tour="ai-credits-widget"
      aria-label={`AI credits:${available === null ? "unlimited" : `${available.toLocaleString("en-IN")} left`}`}
      className="side-label mx-3 mb-3 block rounded-2xl border border-[var(--side-line)] bg-[var(--side-card)] p-3.5 outline-none transition-colors duration-200 hover:bg-[var(--side-hover)] focus-visible:ring-2 focus-visible:ring-focus"
    >
      <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--side-faint)]">
        AI credits
        {!plan.unlimited && <span className="tabular-nums">{Math.round(pct)}%</span>}
      </span>
      <span className="mt-1.5 block text-title font-semibold tabular-nums text-[var(--side-text)]">
        {available === null ? "Unlimited" : available.toLocaleString("en-IN")}
        {available !== null && <span className="ml-1 text-body font-normal text-[var(--side-dim)]">left</span>}
      </span>
      {!plan.unlimited && (
        <span aria-hidden className="mt-3 block h-1.5 overflow-hidden rounded-full bg-[var(--side-line)]">
          <span
            className={cn("grow-x block h-full rounded-full", low ? "bg-warning" : "bg-[var(--side-accent)]")}
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </span>
      )}
      {purchased > 0 && (
        <span className="mt-2 block text-caption tabular-nums text-[var(--side-dim)]">
          +{purchased.toLocaleString("en-IN")} extra
        </span>
      )}
    </Link>
  );
}

/** Avatar, name, role and a ⋮ menu (profile, billing, sign out). */
function AccountFooter() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  // Fixed position from the button: the menu is portalled to <body> because the sidebar
  // clips its overflow (a 224px menu would be cut off by the 64px rail)
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const userName = user ? `${user.firstName} ${user.lastName}` : "User";
  const role = user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : "User";

  const toggle = () => {
    const r = buttonRef.current?.getBoundingClientRect();
    if (r) {
      setPos(
        collapsed
          ? { left: r.right + 10, bottom: window.innerHeight - r.bottom }
          : { left: r.left, bottom: window.innerHeight - r.top + 8 },
      );
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const avatar = (
    <span className="relative shrink-0">
      <Avatar name={userName} size="sm" />
      <span aria-hidden className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-success ring-2 ring-[var(--side-bg)]" />
    </span>
  );

  const menuItem =
    "flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-body text-on-surface outline-none transition-colors hover:bg-surface-container-high focus-visible:bg-surface-container-high";

  return (
    <div ref={ref} className="relative shrink-0 border-t border-[var(--side-line)] p-3">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${userName}, ${role}`}
        className="side-row flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left outline-none transition-colors duration-200 hover:bg-[var(--side-hover)] focus-visible:ring-2 focus-visible:ring-focus"
      >
        {collapsed ? (
          <Tooltip content={userName} side="right">
            {avatar}
          </Tooltip>
        ) : (
          avatar
        )}
        <span className="side-label min-w-0 flex-1">
          <span className="block truncate text-body font-semibold text-[var(--side-text)]">{userName}</span>
          <span className="block truncate text-caption text-[var(--side-faint)]">{role}</span>
        </span>
        <MoreVertical aria-hidden className="side-label h-4 w-4 shrink-0 text-[var(--side-faint)]" />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
      <AnimatePresence>
        {open && pos && (
          <motion.div
            ref={menuRef}
            role="menu"
            aria-label="Account"
            className="fixed z-50 w-56 overflow-hidden rounded-xl bg-surface-container p-1 shadow-popover"
            style={{ left: pos.left, bottom: pos.bottom }}
            initial={{ opacity: 0, y: motionTokens.distance.sm, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: springs.snappy }}
            exit={{ opacity: 0, y: motionTokens.distance.sm, transition: { duration: motionTokens.duration.fast } }}
          >
            <Link role="menuitem" href="/settings/profile" onClick={() => setOpen(false)} className={menuItem}>
              <User className="h-4 w-4 text-on-surface-variant" />
              My profile
            </Link>
            {user?.role === "ADMIN" && (
              <Link role="menuitem" href="/settings/billing" onClick={() => setOpen(false)} className={menuItem}>
                <CreditCard className="h-4 w-4 text-on-surface-variant" />
                Billing &amp; plan
              </Link>
            )}
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                logout.mutate();
              }}
              className={cn(menuItem, "text-error hover:bg-error/10 focus-visible:bg-error/10")}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const mobileOpen = useUIStore((s) => s.mobileSidebarOpen);
  const setMobileOpen = useUIStore((s) => s.setMobileSidebarOpen);
  const pathname = usePathname();
  // Groups, role/plan/org-type filtering: nav-config.tsx (shared with the mobile More screen)
  const { sections, isFreelancer } = useNavSections();
  const { data: orgSettings } = useOrgSettings();

  // Row counts: inbox unread comes from the cached chat list (no extra request)
  const inboxUnread = useInboxUnreadCount();
  const { data: contactsPage } = useContacts({ take: 1 });
  const counts: Counts = { inbox: inboxUnread, contacts: contactsPage?.total };

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

  // "[" collapses / expands the rail (desktop), unless the user is typing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (!window.matchMedia("(min-width: 1024px)").matches) return;
      e.preventDefault();
      toggleSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);

  const home = isFreelancer ? "/dashboard/freelancer" : "/dashboard";
  const toggleLabel = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <aside
      id="app-sidebar"
      aria-label="Main navigation"
      data-collapsed={collapsed}
      data-open={mobileOpen}
      className={cn(
        "app-sidebar fixed left-0 top-0 z-40 flex h-dvh w-[var(--sidebar-width)] flex-col overflow-hidden",
        "transition-[width,translate,box-shadow] duration-200 ease-standard",
        "max-lg:-translate-x-full max-lg:data-[open=true]:translate-x-0 max-lg:data-[open=true]:shadow-modal",
      )}
    >
      {/* Brand: logo tile, product + workspace name, collapse button */}
      <div className={cn("flex shrink-0 gap-2 p-3", collapsed ? "flex-col items-center" : "items-center")}>
        <Link
          href={home}
          aria-label="Wazelo home"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1 outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--side-tile)]">
            <img src="/logo/logo.png" alt="" className="size-6 object-contain" />
          </span>
          <span className="side-label min-w-0">
            <span className="block text-title-sm font-semibold tracking-tight text-[var(--side-text)]">Wazelo</span>
            {orgSettings?.name && (
              <span className="block truncate text-caption text-[var(--side-faint)]">{orgSettings.name}</span>
            )}
          </span>
        </Link>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={toggleLabel}
          aria-keyshortcuts="["
          aria-pressed={collapsed}
          aria-controls="app-sidebar"
          title={`${toggleLabel} ( [ )`}
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--side-line)] bg-[var(--side-card)] text-[var(--side-dim)] outline-none transition-colors duration-200 hover:bg-[var(--side-hover)] hover:text-[var(--side-text)] focus-visible:ring-2 focus-visible:ring-focus max-lg:hidden"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="side-scroll flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
        {sections.map((section) => (
          <NavSection key={section.label} label={section.label} items={section.items} counts={counts} />
        ))}
      </nav>

      <AiCreditsWidget />
      <AccountFooter />
    </aside>
  );
}
