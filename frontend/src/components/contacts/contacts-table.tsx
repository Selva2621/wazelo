"use client";

import { Users, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableHeader,
  TableHeaderRow,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { LeadStatusBadge } from "./lead-status-badge";
import { LeadScoreBadge } from "./lead-score-badge";
import type { Contact, ContactSource } from "@/lib/types/contacts";

interface ContactsTableProps {
  contacts: Contact[];
  total: number;
  take: number;
  skip: number;
  isLoading: boolean;
  onRowClick: (id: string) => void;
  onPageChange: (page: number) => void;
  onCreateClick: () => void;
}

const SOURCE_LABELS: Record<ContactSource, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  EMAIL: "Email",
  MANUAL: "Manual",
  IMPORT: "Import",
  API: "API",
  FACEBOOK_LEAD_AD: "FB Lead Ad",
  INSTAGRAM_LEAD_AD: "IG Lead Ad",
  WHATSAPP_LEAD_AD: "WA Lead Ad",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
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
}: ContactsTableProps) {
  const currentPage = Math.floor(skip / take) + 1;
  const totalPages = Math.ceil(total / take);

  if (isLoading) {
    return (
      <div className="space-y-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-3 border-b border-outline-variant/10"
          >
            <div className="h-9 w-9 rounded-full bg-surface-container animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-32 rounded bg-surface-container animate-pulse" />
              <div className="h-3 w-24 rounded bg-surface-container animate-pulse" />
            </div>
            <div className="h-5 w-16 rounded-full bg-surface-container animate-pulse" />
            <div className="h-3.5 w-24 rounded bg-surface-container animate-pulse" />
            <div className="h-5 w-12 rounded-full bg-surface-container animate-pulse" />
            <div className="h-3.5 w-16 rounded bg-surface-container animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="No contacts found"
        description="Create your first contact or adjust your filters."
        actionLabel="Create Contact"
        onAction={onCreateClick}
      />
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableHeaderRow>
            <TableHead>Contact</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Products</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Created</TableHead>
            <TableHead align="right"></TableHead>
          </TableHeaderRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow
              key={contact.id}
              className="cursor-pointer"
              onClick={() => onRowClick(contact.id)}
            >
              <TableCell>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    name={contact.name || contact.phoneNumber}
                    src={contact.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-on-surface truncate">
                      {contact.name || "Unknown"}
                    </p>
                    <p className="text-[11px] text-on-surface-variant/60 truncate">
                      {contact.phoneNumber}
                    </p>
                  </div>
                </div>
              </TableCell>

              <TableCell className="text-[12px] text-on-surface-variant truncate max-w-[180px]">
                {contact.email || "—"}
              </TableCell>

              <TableCell>
                <LeadStatusBadge status={contact.leadStatus} />
              </TableCell>

              <TableCell>
                <LeadScoreBadge score={contact.leadScore} />
              </TableCell>

              <TableCell className="text-[12px] text-on-surface-variant truncate">
                {contact.owner.firstName} {contact.owner.lastName}
              </TableCell>

              <TableCell>
                <div className="flex gap-1 overflow-hidden">
                  {contact.contactTags.slice(0, 2).map((ct) => (
                    <Badge key={ct.id} variant="muted">
                      {ct.tag.name}
                    </Badge>
                  ))}
                  {contact.contactTags.length > 2 && (
                    <span className="text-[11px] text-on-surface-variant/50">
                      +{contact.contactTags.length - 2}
                    </span>
                  )}
                </div>
              </TableCell>

              <TableCell>
                <div className="flex gap-1 overflow-hidden">
                  {(contact.contactProducts || []).slice(0, 2).map((cp) => (
                    <Badge key={cp.product.id} variant="info">
                      {cp.product.name}
                    </Badge>
                  ))}
                  {(contact.contactProducts || []).length > 2 && (
                    <span className="text-[11px] text-on-surface-variant/50">
                      +{(contact.contactProducts || []).length - 2}
                    </span>
                  )}
                </div>
              </TableCell>

              <TableCell>
                <Badge variant="default">
                  {SOURCE_LABELS[contact.source] ?? contact.source}
                </Badge>
              </TableCell>

              <TableCell className="text-[11px] text-on-surface-variant/60">
                {timeAgo(contact.createdAt)}
              </TableCell>

              <TableCell>
                <Link
                  href={`/contacts/${contact.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors inline-flex"
                  title="View full profile"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        total={total}
        onPageChange={(p) => onPageChange(p - 1)}
      />
    </div>
  );
}
