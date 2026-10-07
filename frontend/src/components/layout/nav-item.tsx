"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CountBadge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { useUIStore } from "@/stores/ui-store";
import type { ReactNode } from "react";

interface NavItemProps {
  href: string;
  icon: ReactNode;
  label: string;
  count?: number;
}

/**
 * Sidebar row: a rounded pill inside the floating rail. In the collapsed rail the label is
 * hidden, so the icon gets a tooltip (the rail itself never expands on hover; only the
 * header toggle opens it).
 */
export function NavItem({ href, icon, label, count }: NavItemProps) {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const isActive = pathname === href || pathname.startsWith(href + "/");
  const hasCount = count !== undefined && count > 0;

  const link = (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      // The visible label is display:none in the collapsed rail, which also hides it from
      // assistive tech; keep an explicit name.
      aria-label={label}
      className={cn(
        "group relative z-[1] flex h-12 flex-1 items-center pr-3 text-body transition-colors duration-120 ease-standard",
        "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus",
        isActive
          ? collapsed
            ? "mr-2.5 rounded-xl bg-surface font-medium text-on-surface"
            : // Expanded: page-coloured tab running to the rail's edge, fused into the content
              // (inverted corners from `.side-tab` in globals.css)
              "rounded-l-2xl bg-surface font-medium text-on-surface"
          : "mr-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
      )}
    >
      <span
        className={cn(
          "relative mx-2 grid size-9 shrink-0 place-items-center rounded-[10px] transition-colors duration-120 ease-standard [&_svg]:size-[18px]",
          isActive
            ? "bg-primary text-on-primary"
            : "bg-surface-container-low group-hover:bg-surface-container",
        )}
      >
        {icon}
        {hasCount && (
          <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary ring-2 ring-sidebar" />
        )}
      </span>
      <span className="side-label flex-1 truncate">{label}</span>
      {hasCount && <CountBadge count={count} className="side-label" />}
    </Link>
  );

  return (
    <li className="side-tab" data-active={isActive}>
      {collapsed ? (
        <Tooltip content={label} side="right" className="flex w-full">
          {link}
        </Tooltip>
      ) : (
        link
      )}
    </li>
  );
}
