"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { useUIStore } from "@/stores/ui-store";

function isOn(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/** Accent bar on the active row; slides from row to row (shared layoutId). */
function ActiveBar() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      layoutId="side-active-bar"
      aria-hidden
      className="side-bar"
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 38 }}
    />
  );
}

const rowClass = (active: boolean) =>
  cn(
    "side-row group relative flex h-10 w-full items-center gap-3 rounded-xl px-3 text-body font-semibold",
    "outline-none transition-colors duration-200 ease-standard focus-visible:ring-2 focus-visible:ring-focus",
    active
      ? "bg-[var(--side-active)] text-[var(--side-text)]"
      : "text-[var(--side-dim)] hover:bg-[var(--side-hover)] hover:text-[var(--side-text)]",
  );

function RowIcon({ icon, active, dot, highlight }: { icon: ReactNode; active: boolean; dot?: boolean; highlight?: boolean }) {
  return (
    <span
      // key: re-mounting on activation replays the pop
      key={active ? "on" : "off"}
      className={cn("relative grid size-5 shrink-0 place-items-center [&_svg]:size-[19px]", active && "side-icon-pop")}
    >
      {icon}
      {dot && <span aria-hidden className={cn("side-dot", highlight && "side-dot-hi")} />}
    </span>
  );
}

/** In the collapsed rail labels are hidden, so each row gets a tooltip. */
function WithTooltip({ label, children }: { label: string; children: ReactNode }) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  if (!collapsed) return <>{children}</>;
  return (
    <Tooltip content={label} side="right" className="flex w-full">
      {children}
    </Tooltip>
  );
}

interface NavItemProps {
  href: string;
  icon: ReactNode;
  label: string;
  count?: number;
  /** Count shown in the accent colour (unread items). */
  highlight?: boolean;
}

/** Sidebar row: icon, label, optional count pill. Active row gets the accent bar. */
export function NavItem({ href, icon, label, count, highlight }: NavItemProps) {
  const pathname = usePathname();
  const active = isOn(pathname, href);
  const hasCount = count !== undefined && count > 0;

  return (
    <li className="relative">
      <WithTooltip label={hasCount ? `${label} · ${count}` : label}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          // The visible label is display:none in the collapsed rail; keep an explicit name
          aria-label={hasCount ? `${label}, ${count}${highlight ? " unread" : ""}` : label}
          className={rowClass(active)}
        >
          {active && <ActiveBar />}
          <RowIcon icon={icon} active={active} dot={hasCount} highlight={highlight} />
          <span className="side-label flex-1 truncate">{label}</span>
          {hasCount && (
            <span aria-hidden className={cn("side-label side-count", highlight && "side-count-hi")}>
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Link>
      </WithTooltip>
    </li>
  );
}

interface NavGroupProps {
  label: string;
  icon: ReactNode;
  items: { href: string; label: string }[];
}

/**
 * Expandable row: the parent opens its first page; the chevron shows or hides the
 * sub-pages, which hang off a tree line. Opens by itself while one of them is active.
 * The collapsed rail shows just the parent icon.
 */
export function NavGroup({ label, icon, items }: NavGroupProps) {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const listId = useId();
  const childActive = items.some((i) => isOn(pathname, i.href));
  // null = follow the route (open while a child is active); a click overrides it
  const [manual, setManual] = useState<boolean | null>(null);
  const open = !collapsed && (manual ?? childActive);

  return (
    <li className="relative">
      <WithTooltip label={label}>
        <Link href={items[0].href} aria-label={label} className={cn(rowClass(childActive), "pr-9")}>
          {childActive && <ActiveBar />}
          <RowIcon icon={icon} active={childActive} />
          <span className="side-label flex-1 truncate">{label}</span>
        </Link>
      </WithTooltip>
      {!collapsed && (
        <button
          type="button"
          onClick={() => setManual(!open)}
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`${open ? "Hide" : "Show"} ${label} pages`}
          className="absolute right-1.5 top-2 grid size-6 place-items-center rounded-md text-[var(--side-faint)] outline-none transition-colors hover:bg-[var(--side-hover)] hover:text-[var(--side-text)] focus-visible:ring-2 focus-visible:ring-focus"
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform duration-200 ease-standard", open && "rotate-90")} />
        </button>
      )}
      {/* Height animates via grid rows; closed sub-pages are inert so Tab skips them */}
      <div
        id={listId}
        inert={!open}
        className="grid transition-[grid-template-rows] duration-250 ease-standard"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <ul className="side-tree min-h-0 overflow-hidden">
          {items.map((item) => {
            const active = isOn(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-[34px] items-center rounded-lg pl-[42px] pr-2 text-body font-semibold outline-none transition-colors duration-200",
                    "focus-visible:ring-2 focus-visible:ring-focus",
                    active ? "text-[var(--side-text)]" : "text-[var(--side-faint)] hover:text-[var(--side-text)]",
                  )}
                >
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </li>
  );
}
