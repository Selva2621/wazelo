import { cn } from "@/lib/utils";
import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

/* ─── Root ─── */
interface TableProps {
  children: ReactNode;
  className?: string;
}

interface TableRootProps extends TableProps {
  /**
   * Pin the header while rows scroll. The table wrapper becomes the scroll container
   * (both axes), so give it a bounded height, e.g. `flex-1 min-h-0` in a flex column.
   */
  stickyHeader?: boolean;
}

export function Table({ children, className, stickyHeader = false }: TableRootProps) {
  return (
    <div
      className={cn(
        stickyHeader
          ? "overflow-auto [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-surface-container-low"
          : "overflow-x-auto",
        className,
      )}
    >
      <table className="w-full text-body-lg">{children}</table>
    </div>
  );
}

/* ─── Head ─── */
export function TableHeader({ children, className }: TableProps) {
  return <thead className={className}>{children}</thead>;
}

/* ─── Head Row (with background + border) ─── */
export function TableHeaderRow({ children, className }: TableProps) {
  return (
    <tr
      className={cn(
        "bg-surface-container/40 border-b border-outline-variant/15",
        className,
      )}
    >
      {children}
    </tr>
  );
}

/* ─── Head Cell ─── */
interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}

export function TableHead({
  children,
  className,
  align = "left",
  ...props
}: TableHeadProps) {
  return (
    <th
      className={cn(
        "px-5 py-3 text-caption font-semibold uppercase tracking-wider text-on-surface-variant",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

/* ─── Body ─── */
export function TableBody({ children, className }: TableProps) {
  return <tbody className={className}>{children}</tbody>;
}

/* ─── Body Row ─── */
interface TableRowProps extends TableProps {
  onClick?: () => void;
}

export function TableRow({ children, className, onClick }: TableRowProps) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-b border-outline-variant/5 hover:bg-surface-container/20 transition-colors",
        className,
      )}
    >
      {children}
    </tr>
  );
}

/* ─── Body Cell ─── */
interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}

export function TableCell({
  children,
  className,
  align = "left",
  ...props
}: TableCellProps) {
  return (
    <td
      className={cn(
        "px-5 py-3",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}
