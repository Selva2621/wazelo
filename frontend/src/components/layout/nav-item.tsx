"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CountBadge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import type { ReactNode } from "react";

interface NavItemProps {
  href: string;
  icon: ReactNode;
  label: string;
  count?: number;
  collapsed?: boolean;
}

export function NavItem({
  href,
  icon,
  label,
  count,
  collapsed,
}: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  const content = (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors relative",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
        collapsed && "justify-center px-0",
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" />
      )}
      <span className={cn("shrink-0", collapsed ? "ml-0" : "ml-1")}>
        {icon}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {count !== undefined && count > 0 && <CountBadge count={count} />}
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip content={label} side="right">
        <div className="relative">
          {content}
          {count !== undefined && count > 0 && (
            <CountBadge
              count={count}
              className="absolute -top-1 -right-1 scale-90"
            />
          )}
        </div>
      </Tooltip>
    );
  }

  return content;
}
