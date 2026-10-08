"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { LeadStatusBadge } from "@/components/contacts/lead-status-badge";
import { useContacts, useChangeLeadStatus } from "@/hooks/use-contacts";
import { useContactsStore } from "@/stores/contacts-store";
import type { LeadStatus, Contact, ContactSource, ListContactsParams } from "@/lib/types/contacts";

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
  { status: "NEW",        label: "New",        color: "var(--info)" },
  { status: "CONTACTED",  label: "Contacted",  color: "var(--primary-container)" },
  { status: "INTERESTED", label: "Interested", color: "var(--warning)" },
  { status: "CONVERTED",  label: "Converted",  color: "var(--success)" },
  { status: "CLOSED",     label: "Closed",     color: "var(--on-surface-variant)" },
];

const SCRAPE_SOURCE_LABELS: Record<string, string> = {
  GOOGLE_MAPS:   "Google Maps",
  UPWORK_JOBS:   "Upwork",
  FREELANCER_IN: "Freelancer.in",
  TRUELANCER:    "Truelancer",
  LINKEDIN_JOBS: "LinkedIn",
};

// ─── Contact Card ─────────────────────────────────────────────────────────────

function PipelineCard({
  contact,
  onDragStart,
  onClick,
}: {
  contact: Contact;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: (id: string) => void;
}) {
  const meta = contact.metadata as Record<string, unknown> | null;
  const scrapeSource = meta?.scrapeSource as string | undefined;
  const rating = meta?.rating as number | undefined;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, contact.id)}
      onClick={() => onClick(contact.id)}
      className="cursor-grab active:cursor-grabbing bg-surface-container rounded-lg p-3 border border-outline-variant/10 hover:border-outline-variant/30 hover:bg-surface-container-high transition-colors space-y-2"
    >
      {/* Avatar + name */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar name={contact.name || contact.phoneNumber} src={contact.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium text-on-surface truncate">
            {contact.name || "Unknown"}
          </p>
          <p className="text-caption text-on-surface-variant/60 truncate">{contact.phoneNumber}</p>
        </div>
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {scrapeSource && SCRAPE_SOURCE_LABELS[scrapeSource] && (
          <span className="text-caption bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
            {SCRAPE_SOURCE_LABELS[scrapeSource]}
          </span>
        )}
        {rating != null && (
          <span className="text-caption text-warning font-medium">★ {rating.toFixed(1)}</span>
        )}
        <LeadStatusBadge status={contact.leadStatus} />
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function PipelineColumn({
  status,
  label,
  color,
  baseFilter,
  onDragStart,
  onDrop,
  onCardClick,
}: {
  status: LeadStatus;
  label: string;
  color: string;
  baseFilter: ListContactsParams;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, status: LeadStatus) => void;
  onCardClick: (id: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { data, isLoading } = useContacts({ ...baseFilter, leadStatus: status, take: 100 });
  const contacts = data?.contacts ?? [];

  return (
    <div
      className={`flex flex-col w-[272px] shrink-0 rounded-xl border transition-colors ${
        isDragOver
          ? "border-primary/40 bg-primary/5"
          : "border-outline-variant/10 bg-surface-container/40"
      }`}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { setIsDragOver(false); onDrop(e, status); }}
    >
      {/* Column header */}
      <div className="shrink-0 flex items-center gap-2 px-3.5 py-3 border-b border-outline-variant/10">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-body font-semibold text-on-surface">{label}</span>
        <Badge variant="muted" className="text-caption ml-auto">
          {isLoading ? "…" : contacts.length}
        </Badge>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" className="text-on-surface-variant/40" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-8 text-label text-on-surface-variant/40">No leads</div>
        ) : (
          contacts.map((c) => (
            <PipelineCard
              key={c.id}
              contact={c}
              onDragStart={onDragStart}
              onClick={onCardClick}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadPipelinePage() {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const changeLeadStatus = useChangeLeadStatus();
  const openContactDetail = useContactsStore((s) => s.openContactDetail);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStatus: LeadStatus) => {
    e.preventDefault();
    if (!draggedId) return;
    changeLeadStatus.mutate({ contactId: draggedId, status: targetStatus });
    setDraggedId(null);
  };

  // Only show WEB_SCRAPE contacts
  const baseFilter: ListContactsParams = { source: "WEB_SCRAPE" as ContactSource };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-outline-variant/10">
        <h1 className="text-title font-semibold text-on-surface">Lead Pipeline</h1>
        <p className="text-body-lg text-on-surface-variant mt-0.5">
          Scraped leads tracked through your sales stages. Drag cards to update status.
        </p>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 p-6 h-full min-h-0">
          {COLUMNS.map((col) => (
            <PipelineColumn
              key={col.status}
              status={col.status}
              label={col.label}
              color={col.color}
              baseFilter={baseFilter}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onCardClick={openContactDetail}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
