"use client";

import { Fragment, type KeyboardEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState, LoadError } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeaderRow,
  TableRow,
} from "@/components/ui/table";

/**
 * One table for every list page. A page describes its columns; the table handles loading
 * skeletons, empty and error states, sorting, row selection, clickable rows, pagination
 * and the phone layout (MobileTableLabels turns it into iOS cards below 1024px, or pass
 * renderMobileRow for a custom phone list).
 */

export interface DataTableColumn<T> {
  id: string;
  /** Column title. Also used as the cell label on phone cards. */
  header: string;
  /** Hide the title visually (e.g. an actions column); screen readers still get it. */
  hideHeader?: boolean;
  cell: (row: T, index: number) => ReactNode;
  align?: "left" | "center" | "right";
  /** Classes for the header and body cells, e.g. a width ("w-32"). */
  className?: string;
  /** Extra classes for body cells only. */
  cellClassName?: string;
  /** Shows a sort button in the header; needs `sort` + `onSortChange` on the table. */
  sortable?: boolean;
  /** Placeholder shape while loading. Default "text". */
  skeleton?: SkeletonKind;
}

type SkeletonKind = "avatar" | "text" | "short" | "badge" | "bar" | "none";

export type DataTableSort = { id: string; order: "asc" | "desc" };

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Accessible name for the table, e.g. "Contacts". */
  label: string;
  /** Readable name of one row, for selection and row-button labels. */
  rowLabel?: (row: T) => string;

  loading?: boolean;
  /** Number of placeholder rows while loading. Default 8. */
  skeletonRows?: number;
  /** Shows a retry box instead of the table. */
  error?: boolean;
  onRetry?: () => void;
  /** Empty state when there are no rows (and not loading or errored). */
  empty?: {
    icon?: ReactNode;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    /** One quiet line instead of the large empty state (small tables inside cards). */
    compact?: boolean;
  };

  /** Detail row under a row (full width), e.g. an execution log's error and results. */
  renderExpandedRow?: (row: T) => ReactNode;
  /** Which rows show their detail row. */
  isRowExpanded?: (row: T) => boolean;

  onRowClick?: (row: T) => void;
  /** Screen-reader name of a clickable row. Default: "Open {rowLabel}". */
  rowActionLabel?: (row: T) => string;
  rowClassName?: (row: T) => string | undefined;

  /**
   * Adds a checkbox column. Selection is a set of row keys. By default the header checkbox
   * selects the visible page; pass toggleAll/allChecked/someChecked when it should mean
   * something wider (e.g. every filtered result across pages).
   */
  selection?: {
    selected: Set<string>;
    onChange: (next: Set<string>) => void;
    toggleAll?: () => void;
    allChecked?: boolean;
    someChecked?: boolean;
    /** Header checkbox label, e.g. "Select all 240 results". */
    toggleAllLabel?: string;
  };

  sort?: DataTableSort | null;
  onSortChange?: (next: DataTableSort) => void;

  /** Server-side pages; `page` is 0-based. Hidden when everything fits on one page. */
  pagination?: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void };

  /** Header stays pinned while rows scroll; give the table a bounded height (flex-1 min-h-0). */
  stickyHeader?: boolean;
  /** Classes for the scroll container (around the <table>). */
  className?: string;
  /** Classes for the outer wrapper (table + pagination). */
  wrapperClassName?: string;

  /** Custom phone list (below 1024px) instead of the automatic cards. */
  renderMobileRow?: (row: T) => ReactNode;
  /** Classes for the phone list (<ul>), e.g. edge-to-edge rows instead of the inset group. */
  mobileListClassName?: string;
}

const checkboxClass = "size-4 cursor-pointer rounded border-outline-variant accent-primary align-middle";

const skeletonShape: Record<SkeletonKind, string> = {
  avatar: "",
  text: "h-3.5 w-24 rounded",
  short: "h-3.5 w-12 rounded",
  badge: "h-5 w-16 rounded-full",
  bar: "h-1.5 w-24 rounded-full",
  none: "",
};

function SkeletonCell({ kind }: { kind: SkeletonKind }) {
  if (kind === "none") return null;
  if (kind === "avatar") {
    return (
      <div className="flex items-center gap-3">
        <div className="size-8 shrink-0 animate-pulse rounded-full bg-surface-container" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 animate-pulse rounded bg-surface-container" />
          <div className="h-3 w-20 animate-pulse rounded bg-surface-container" />
        </div>
      </div>
    );
  }
  return <div className={cn("animate-pulse bg-surface-container", skeletonShape[kind])} />;
}

function SortIcon({ order }: { order: "asc" | "desc" | null }) {
  if (order === "asc") return <ArrowUp className="h-3.5 w-3.5" aria-hidden />;
  if (order === "desc") return <ArrowDown className="h-3.5 w-3.5" aria-hidden />;
  return <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden />;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  label,
  rowLabel,
  loading = false,
  skeletonRows = 8,
  error = false,
  onRetry,
  empty,
  onRowClick,
  rowActionLabel,
  rowClassName,
  selection,
  sort,
  onSortChange,
  pagination,
  stickyHeader = false,
  className,
  wrapperClassName,
  renderMobileRow,
  mobileListClassName,
  renderExpandedRow,
  isRowExpanded,
}: DataTableProps<T>) {
  if (error) {
    return <LoadError what={label.toLowerCase()} onRetry={onRetry ?? (() => {})} className="m-6" />;
  }

  if (!loading && rows.length === 0 && empty) {
    if (empty.compact || !empty.icon || !empty.description) {
      return (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          {/* Icon shrinks to a small muted mark in the quiet version */}
          {empty.icon && <span aria-hidden className="text-on-surface-variant/60 [&_svg]:size-6">{empty.icon}</span>}
          <p className="text-body font-medium text-on-surface">{empty.title}</p>
          {empty.description && <p className="text-label text-on-surface-variant">{empty.description}</p>}
          {empty.actionLabel && empty.onAction && (
            <button type="button" onClick={empty.onAction} className="text-body font-medium text-primary hover:underline">
              {empty.actionLabel}
            </button>
          )}
        </div>
      );
    }
    return (
      <EmptyState
        icon={empty.icon}
        title={empty.title}
        description={empty.description}
        actionLabel={empty.actionLabel}
        onAction={empty.onAction}
      />
    );
  }

  const keys = rows.map(rowKey);
  const selectedOnPage = selection ? keys.filter((k) => selection.selected.has(k)).length : 0;
  const allSelected = selection?.allChecked ?? (keys.length > 0 && selectedOnPage === keys.length);
  const someSelected = selection?.someChecked ?? (selectedOnPage > 0 && !allSelected);

  const toggleOne = (key: string) => {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    selection.onChange(next);
  };
  const toggleAll = () => {
    if (!selection) return;
    if (selection.toggleAll) return selection.toggleAll();
    const next = new Set(selection.selected);
    for (const k of keys) {
      if (allSelected) next.delete(k);
      else next.add(k);
    }
    selection.onChange(next);
  };

  const onRowKey = (e: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    // Enter/Space on the focused row opens it, unless a control inside the row has focus
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onRowClick?.(row);
    }
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 0;

  return (
    // data-table-card: white card on desktop (globals.css); flattens itself inside another card
    // Sticky tables: the card hugs its rows and only scrolls inside when they outgrow the space
    <div data-tour="data-table" className={cn("data-table-card flex flex-col", stickyHeader && "max-h-full", wrapperClassName)}>
      {renderMobileRow && (
        <ul
          aria-label={label}
          aria-busy={loading || undefined}
          className={cn(
            "mx-4 mb-4 mt-1 divide-y divide-outline-variant/40 overflow-hidden rounded-xl bg-surface-container-lowest lg:hidden",
            mobileListClassName,
          )}
        >
          {loading
            ? // Placeholder rows, so phones don't show a blank page while loading
              Array.from({ length: Math.min(skeletonRows, 8) }).map((_, i) => (
                <li key={`skeleton-${i}`} aria-hidden className="flex items-center gap-3 px-4 py-3.5">
                  <div className="size-10 shrink-0 animate-pulse rounded-full bg-surface-container" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3.5 w-32 animate-pulse rounded bg-surface-container" />
                    <div className="h-3 w-24 animate-pulse rounded bg-surface-container" />
                  </div>
                </li>
              ))
            : rows.map((row, i) => {
                const key = keys[i];
                if (!selection) return <li key={key}>{renderMobileRow(row)}</li>;
                const selected = selection.selected.has(key);
                // Selectable lists: a compact checkbox (44px tap area) leading the row
                return (
                  <li key={key} className={cn("flex items-stretch", selected && "bg-primary/5")}>
                    <label className="flex w-11 shrink-0 cursor-pointer items-center justify-center pl-2">
                      <input
                        type="checkbox"
                        className={checkboxClass}
                        checked={selected}
                        onChange={() => toggleOne(key)}
                        aria-label={`Select ${rowLabel ? rowLabel(row) : "row"}`}
                      />
                    </label>
                    <div className="min-w-0 flex-1">{renderMobileRow(row)}</div>
                  </li>
                );
              })}
        </ul>
      )}

      <Table
        stickyHeader={stickyHeader}
        className={cn(stickyHeader && "min-h-0", renderMobileRow && "max-lg:hidden", className)}
      >
        <caption className="sr-only">{label}</caption>
        <TableHeader>
          <TableHeaderRow>
            {selection && (
              <TableHead className="w-10 pr-0">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={allSelected}
                  disabled={loading || rows.length === 0}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label={
                    selection.toggleAllLabel ?? (allSelected ? "Deselect all on this page" : "Select all on this page")
                  }
                />
              </TableHead>
            )}
            {columns.map((col) => {
              const active = sort?.id === col.id ? sort.order : null;
              const canSort = !!col.sortable && !!onSortChange;
              return (
                <TableHead
                  key={col.id}
                  align={col.align}
                  className={col.className}
                  aria-sort={canSort ? (active === "asc" ? "ascending" : active === "desc" ? "descending" : "none") : undefined}
                >
                  {col.hideHeader ? (
                    <span className="sr-only">{col.header}</span>
                  ) : canSort ? (
                    <button
                      type="button"
                      onClick={() => onSortChange?.({ id: col.id, order: active === "asc" ? "desc" : "asc" })}
                      className={cn(
                        "-mx-1 inline-flex items-center gap-1 rounded px-1 outline-none transition-colors hover:text-on-surface",
                        "focus-visible:ring-2 focus-visible:ring-focus",
                        active && "text-on-surface",
                      )}
                    >
                      {col.header}
                      <SortIcon order={active} />
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              );
            })}
          </TableHeaderRow>
        </TableHeader>

        <TableBody>
          {loading
            ? Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className="hover:bg-transparent">
                  {selection && (
                    <TableCell className="w-10 pr-0">
                      <div className="size-4 animate-pulse rounded bg-surface-container" />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.id} align={col.align} className={col.className}>
                      <SkeletonCell kind={col.skeleton ?? "text"} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : rows.map((row, i) => {
                const key = keys[i];
                const selected = selection?.selected.has(key) ?? false;
                const expanded = !!renderExpandedRow && !!isRowExpanded?.(row);
                return (
                  <Fragment key={key}>
                  <TableRow
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={onRowClick ? (e) => onRowKey(e, row) : undefined}
                    aria-label={
                      onRowClick
                        ? rowActionLabel
                          ? rowActionLabel(row)
                          : rowLabel
                            ? `Open ${rowLabel(row)}`
                            : undefined
                        : undefined
                    }
                    // Rows that open a detail row say whether it is open
                    aria-expanded={renderExpandedRow && onRowClick ? expanded : undefined}
                    className={cn(
                      onRowClick &&
                        "outline-none focus-visible:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus",
                      selected && "bg-primary/5 hover:bg-primary/8",
                      rowClassName?.(row),
                    )}
                  >
                    {selection && (
                      <TableCell className="w-10 pr-0" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className={checkboxClass}
                          checked={selected}
                          onChange={() => toggleOne(key)}
                          aria-label={`Select ${rowLabel ? rowLabel(row) : "row"}`}
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.id} align={col.align} className={cn(col.className, col.cellClassName)}>
                        {col.cell(row, i)}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expanded && (
                    <tr className="border-b border-outline-variant/60 bg-surface-container-low/60">
                      <td colSpan={columns.length + (selection ? 1 : 0)} className="px-4 py-3">
                        {renderExpandedRow?.(row)}
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
        </TableBody>
      </Table>

      {pagination && totalPages > 1 && (
        <Pagination
          page={pagination.page + 1}
          totalPages={totalPages}
          total={pagination.total}
          onPageChange={(p) => pagination.onPageChange(p - 1)}
        />
      )}
    </div>
  );
}
