import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

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
      <table className="w-full text-body">{children}</table>
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
        "border-b border-outline-variant",
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
        "h-10 px-4 text-label font-medium whitespace-nowrap text-on-surface-variant",
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
interface TableRowProps
  extends TableProps,
    Pick<HTMLAttributes<HTMLTableRowElement>, "tabIndex" | "onKeyDown" | "aria-label" | "aria-expanded"> {
  onClick?: () => void;
}

export function TableRow({ children, className, onClick, ...rest }: TableRowProps) {
  return (
    <tr
      onClick={onClick}
      {...rest}
      className={cn(
        "border-b border-outline-variant/60 transition-colors duration-120 ease-standard hover:bg-surface-container-low",
        onClick && "cursor-pointer",
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
        "px-4 py-2.5",
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
