"use client";

import { Users, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LeadStatusBadge } from "./lead-status-badge";
import { LeadScoreBadge } from "./lead-score-badge";
import type { Contact } from "@/lib/types/contacts";
import { CONTACT_SOURCE_LABELS as SOURCE_LABELS } from "@/lib/constants/contact-sources";
import { useProductTerms } from "@/lib/product-terms";

interface ContactsTableProps {
  contacts: Contact[];
  total: number;
  take: number;
  skip: number;
  isLoading: boolean;
  onRowClick: (id: string) => void;
  onPageChange: (page: number) => void;
  onCreateClick: () => void;
  /** Row selection for bulk actions; the checkbox column shows only when provided. */
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const displayName = (c: Contact) => c.name || c.phoneNumber;

/** First two chips, then "+N". */
function ChipList<T>({ items, render }: { items: T[]; render: (item: T) => React.ReactNode }) {
  return (
    <div className="flex gap-1 overflow-hidden">
      {items.slice(0, 2).map(render)}
      {items.length > 2 && <span className="text-caption text-on-surface-variant/60">+{items.length - 2}</span>}
    </div>
  );
}

const columns: DataTableColumn<Contact>[] = [
  {
    id: "contact",
    header: "Contact",
    skeleton: "avatar",
    cell: (c) => (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={displayName(c)} src={c.avatarUrl} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-body font-medium text-on-surface">{c.name || "Unknown"}</p>
          <p className="truncate text-caption text-on-surface-variant">{c.phoneNumber}</p>
        </div>
      </div>
    ),
  },
  {
    id: "email",
    header: "Email",
    cellClassName: "max-w-[180px] truncate text-label text-on-surface-variant",
    cell: (c) => c.email || "—",
  },
  { id: "status", header: "Status", skeleton: "badge", cell: (c) => <LeadStatusBadge status={c.leadStatus} /> },
  { id: "score", header: "Score", skeleton: "short", cell: (c) => <LeadScoreBadge score={c.leadScore} /> },
  {
    id: "owner",
    header: "Owner",
    cellClassName: "truncate text-label text-on-surface-variant",
    cell: (c) => `${c.owner.firstName} ${c.owner.lastName}`,
  },
  {
    id: "tags",
    header: "Tags",
    skeleton: "badge",
    cell: (c) => (
      <ChipList
        items={c.contactTags}
        render={(ct) => (
          <Badge key={ct.id} variant="muted">
            {ct.tag.name}
          </Badge>
        )}
      />
    ),
  },
  {
    id: "products",
    header: "Products",
    skeleton: "badge",
    cell: (c) => (
      <ChipList
        items={c.contactProducts || []}
        render={(cp) => (
          <Badge key={cp.product.id} variant="info">
            {cp.product.name}
          </Badge>
        )}
      />
    ),
  },
  {
    id: "source",
    header: "Source",
    skeleton: "badge",
    cell: (c) => <Badge variant="default">{SOURCE_LABELS[c.source] ?? c.source}</Badge>,
  },
  {
    id: "created",
    header: "Created",
    skeleton: "short",
    cellClassName: "text-caption text-on-surface-variant",
    cell: (c) => timeAgo(c.createdAt),
  },
  {
    id: "open",
    header: "Profile",
    hideHeader: true,
    align: "right",
    skeleton: "none",
    cell: (c) => (
      <Link
        href={`/contacts/${c.id}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex rounded-lg p-1.5 text-on-surface-variant outline-none transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-focus"
        title="View full profile"
        aria-label={`View ${displayName(c)} profile`}
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    ),
  },
];

/**
 * Phone row (below 1024px): avatar | name + number | status and score. Tapping the row
 * opens the same quick view as a table row; the trailing icon opens the full profile,
 * like the desktop Profile column.
 */
function ContactMobileRow({ contact: c, onOpen }: { contact: Contact; onOpen: () => void }) {
  const secondary = c.name ? c.phoneNumber : c.email || SOURCE_LABELS[c.source] || c.source;
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${displayName(c)}`}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-2.5 pl-2 pr-2 text-left outline-none transition-colors active:bg-surface-container focus-visible:bg-surface-container-low"
      >
        <Avatar name={displayName(c)} src={c.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold leading-[22px] text-on-surface">{displayName(c)}</p>
          {secondary && (
            <p className="truncate text-[14px] leading-5 text-on-surface-variant">{secondary}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <LeadStatusBadge status={c.leadStatus} />
          <LeadScoreBadge score={c.leadScore} />
        </div>
      </button>
      <Link
        href={`/contacts/${c.id}`}
        className="flex size-11 shrink-0 items-center justify-center text-on-surface-variant/70 outline-none active:text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
        aria-label={`View ${displayName(c)} profile`}
      >
        <ExternalLink className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}

export function ContactsTable({
  contacts,
  total,
  take,
  skip,
  isLoading,
  onRowClick,
  onPageChange,
  onCreateClick,
  selectedIds,
  onSelectionChange,
}: ContactsTableProps) {
  const selection = selectedIds && onSelectionChange ? { selected: selectedIds, onChange: onSelectionChange } : undefined;
  const anySelected = !!selectedIds && contacts.some((c) => selectedIds.has(c.id));
  const terms = useProductTerms();

  return (
    <DataTable
      label="Contacts"
      columns={terms.isService ? columns.map((col) => (col.id === "products" ? { ...col, header: terms.Plural } : col)) : columns}
      rows={contacts}
      rowKey={(c) => c.id}
      rowLabel={displayName}
      loading={isLoading}
      onRowClick={(c) => onRowClick(c.id)}
      selection={selection}
      pagination={{ page: Math.floor(skip / take), pageSize: take, total, onPageChange }}
      stickyHeader
      // Bottom room for the floating bulk bar so the last rows stay reachable
      className={anySelected ? "pb-24" : undefined}
      empty={{
        icon: <Users className="h-12 w-12" />,
        title: "No contacts found",
        description: "Create your first contact or adjust your filters.",
        actionLabel: "New contact",
        onAction: onCreateClick,
      }}
      // Phones: edge-to-edge native list rows; room at the end for the floating bulk bar
      mobileListClassName={cn("mx-0 mt-1 rounded-none", anySelected && "mb-28")}
      renderMobileRow={(c) => <ContactMobileRow contact={c} onOpen={() => onRowClick(c.id)} />}
    />
  );
}
