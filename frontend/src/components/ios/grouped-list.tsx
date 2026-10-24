"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

/**
 * iOS "inset grouped" list: rounded sections with hairline separators, a small
 * caps header above and an optional footnote below (Settings.app style).
 */
export function GroupedSection({
  header,
  footer,
  children,
  className,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("ios-group", className)}>
      {header && <h2 className="ios-group-header">{header}</h2>}
      <ul className="ios-group-body">{children}</ul>
      {footer && <p className="ios-group-footer">{footer}</p>}
    </section>
  );
}

interface ListRowProps {
  /** Rounded-square icon on the left (iOS settings tile) */
  icon?: ReactNode;
  /** Tile colour class, e.g. "bg-primary" */
  iconClassName?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-side value text or control */
  detail?: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Show the › chevron (default: when the row navigates) */
  chevron?: boolean;
  destructive?: boolean;
  className?: string;
}

export function ListRow({
  icon,
  iconClassName,
  title,
  subtitle,
  detail,
  href,
  onClick,
  chevron,
  destructive,
  className,
}: ListRowProps) {
  const showChevron = chevron ?? Boolean(href);
  const body = (
    <>
      {icon && <span className={cn("ios-row-icon", iconClassName ?? "bg-primary")}>{icon}</span>}
      <span className="ios-row-main">
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[16px] leading-[21px]", destructive ? "text-error" : "text-on-surface")}>
            {title}
          </span>
          {subtitle && (
            <span className="mt-0.5 block truncate text-[13px] leading-[18px] text-on-surface-variant">{subtitle}</span>
          )}
        </span>
        {detail !== undefined && (
          <span className="ml-2 flex shrink-0 items-center text-[15px] text-on-surface-variant">{detail}</span>
        )}
        {showChevron && <ChevronRight className="ml-1 h-[18px] w-[18px] shrink-0 text-outline" aria-hidden />}
      </span>
    </>
  );

  const rowClass = cn("ios-row", (href || onClick) && "ios-row-tappable", className);

  return (
    <li>
      {href ? (
        <Link href={href} className={rowClass} onClick={() => haptic()}>
          {body}
        </Link>
      ) : onClick ? (
        <button
          type="button"
          className={cn(rowClass, "w-full text-left")}
          onClick={() => {
            haptic();
            onClick();
          }}
        >
          {body}
        </button>
      ) : (
        <div className={rowClass}>{body}</div>
      )}
    </li>
  );
}
