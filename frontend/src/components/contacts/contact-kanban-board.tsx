"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { LeadStatusBadge } from "./lead-status-badge";
import { useContacts, useChangeLeadStatus } from "@/hooks/use-contacts";
import { useContactsStore } from "@/stores/contacts-store";
import type { LeadStatus, Contact } from "@/lib/types/contacts";

// ─── Column definitions ───

const COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
  { status: "NEW", label: "New", color: "var(--info)" },
  { status: "CONTACTED", label: "Contacted", color: "var(--primary-container)" },
  { status: "INTERESTED", label: "Interested", color: "var(--warning)" },
  { status: "CONVERTED", label: "Converted", color: "var(--success)" },
  { status: "CLOSED", label: "Closed", color: "var(--on-surface-variant)" },
];

// ─── Contact Card ───

interface ContactCardProps {
  contact: Contact;
  onDragStart: (e: React.DragEvent, contactId: string) => void;
  onClick: (contactId: string) => void;
}

function ContactCard({ contact, onDragStart, onClick }: ContactCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, contact.id)}
      onClick={() => onClick(contact.id)}
      className="cursor-grab active:cursor-grabbing bg-surface-container rounded-lg p-3 border border-outline-variant/10 hover:border-outline-variant/30 hover:bg-surface-container-high transition-colors space-y-2.5"
    >
      {/* Name + avatar */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar
          name={contact.name || contact.phoneNumber}
          src={contact.avatarUrl}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium text-on-surface truncate">
            {contact.name || "Unknown"}
          </p>
          <p className="text-caption text-on-surface-variant/60 truncate">
            {contact.phoneNumber}
          </p>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center justify-between gap-2">
        <LeadStatusBadge status={contact.leadStatus} />
        {contact.email && (
          <span className="text-caption text-on-surface-variant/50 truncate max-w-[100px]">
            {contact.email}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Kanban Column ───

interface KanbanColumnProps {
  status: LeadStatus;
  label: string;
  color: string;
  draggedContactId: string | null;
  onDragStart: (e: React.DragEvent, contactId: string) => void;
  onDrop: (e: React.DragEvent, status: LeadStatus) => void;
  onCardClick: (contactId: string) => void;
}

function KanbanColumn({
  status,
  label,
  color,
  draggedContactId,
  onDragStart,
  onDrop,
  onCardClick,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const { data, isLoading } = useContacts({ leadStatus: status, take: 50 });
  const contacts = data?.contacts ?? [];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    setIsDragOver(false);
    onDrop(e, status);
  };

  return (
    <div
      className={`flex flex-col w-[272px] shrink-0 rounded-xl border transition-colors ${
        isDragOver
          ? "border-primary/40 bg-primary/5"
          : "border-outline-variant/10 bg-surface-container/40"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="shrink-0 flex items-center gap-2 px-3.5 py-3 border-b border-outline-variant/10">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-body font-semibold text-on-surface">{label}</span>
        <Badge variant="muted" className="text-caption ml-auto">
          {isLoading ? "…" : contacts.length}
        </Badge>
      </div>

      {/* Column body */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" className="text-on-surface-variant/40" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-8 text-label text-on-surface-variant/40">
            No contacts
          </div>
        ) : (
          contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onDragStart={onDragStart}
              onClick={onCardClick}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Board ───

export function ContactKanbanBoard() {
  const [draggedContactId, setDraggedContactId] = useState<string | null>(null);
  const changeLeadStatus = useChangeLeadStatus();
  const openContactDetail = useContactsStore((s) => s.openContactDetail);

  const handleDragStart = (e: React.DragEvent, contactId: string) => {
    setDraggedContactId(contactId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStatus: LeadStatus) => {
    e.preventDefault();
    if (!draggedContactId) return;
    changeLeadStatus.mutate({ contactId: draggedContactId, status: targetStatus });
    setDraggedContactId(null);
  };

  return (
    <div className="flex-1 overflow-x-auto">
      <div className="flex gap-4 p-6 min-h-0 h-full">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            color={col.color}
            draggedContactId={draggedContactId}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onCardClick={openContactDetail}
          />
        ))}
      </div>
    </div>
  );
}
