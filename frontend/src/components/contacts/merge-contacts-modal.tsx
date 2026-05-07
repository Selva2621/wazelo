"use client";

import { useState } from "react";
import { X, Search, ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LeadStatusBadge } from "./lead-status-badge";
import { useContacts, useMergeContacts } from "@/hooks/use-contacts";
import type { Contact } from "@/lib/types/contacts";

interface MergeContactsModalProps {
  open: boolean;
  onClose: () => void;
}

export function MergeContactsModal({ open, onClose }: MergeContactsModalProps) {
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [secondaryId, setSecondaryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selecting, setSelecting] = useState<"primary" | "secondary">(
    "primary",
  );
  const mergeContacts = useMergeContacts();

  const { data } = useContacts({ search: search || undefined, take: 10 });
  const contacts = data?.contacts ?? [];

  function handleSelect(contact: Contact) {
    if (selecting === "primary") {
      setPrimaryId(contact.id);
      if (!secondaryId) setSelecting("secondary");
    } else {
      setSecondaryId(contact.id);
    }
    setSearch("");
  }

  function handleMerge() {
    if (!primaryId || !secondaryId) return;
    mergeContacts.mutate(
      { primaryContactId: primaryId, secondaryContactId: secondaryId },
      {
        onSuccess: () => {
          setPrimaryId(null);
          setSecondaryId(null);
          setSearch("");
          setSelecting("primary");
          onClose();
        },
      },
    );
  }

  function reset() {
    setPrimaryId(null);
    setSecondaryId(null);
    setSearch("");
    setSelecting("primary");
  }

  const primaryContact = contacts.find((c) => c.id === primaryId);
  const secondaryContact = contacts.find((c) => c.id === secondaryId);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-surface/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-on-surface">
            Merge Contacts
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Selected contacts */}
        <div className="flex items-center gap-3 mb-4">
          <ContactSlot
            label="Primary (keep)"
            contact={primaryContact ?? null}
            active={selecting === "primary"}
            onClick={() => setSelecting("primary")}
            onClear={() => setPrimaryId(null)}
          />
          <ArrowRight className="h-4 w-4 text-on-surface-variant/50 shrink-0" />
          <ContactSlot
            label="Secondary (merge in)"
            contact={secondaryContact ?? null}
            active={selecting === "secondary"}
            onClick={() => setSelecting("secondary")}
            onClear={() => setSecondaryId(null)}
          />
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search for ${selecting} contact...`}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-surface-container-low text-[13px] text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>

        {/* Results */}
        <div className="space-y-1 max-h-48 overflow-y-auto mb-4">
          {contacts
            .filter((c) => {
              if (selecting === "primary") return c.id !== secondaryId;
              return c.id !== primaryId;
            })
            .map((contact) => {
              const isSelected =
                contact.id === primaryId || contact.id === secondaryId;

              return (
                <button
                  key={contact.id}
                  onClick={() => !isSelected && handleSelect(contact)}
                  disabled={isSelected}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    isSelected
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-surface-container-low cursor-pointer"
                  }`}
                >
                  <Avatar
                    name={contact.name || contact.phoneNumber}
                    src={contact.avatarUrl}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-on-surface truncate">
                      {contact.name || "Unknown"}
                    </p>
                    <p className="text-[11px] text-on-surface-variant/60 truncate">
                      {contact.phoneNumber}
                    </p>
                  </div>
                  <LeadStatusBadge status={contact.leadStatus} />
                </button>
              );
            })}

          {search && contacts.length === 0 && (
            <p className="text-center text-[13px] text-on-surface-variant/50 py-4">
              No contacts found
            </p>
          )}
        </div>

        {/* Warning */}
        {primaryId && secondaryId && (
          <div className="rounded-xl bg-error/10 border border-error/20 px-3 py-2 mb-4">
            <p className="text-[12px] text-error">
              The secondary contact will be merged into the primary and marked
              as deleted. This action cannot be undone.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={primaryId || secondaryId ? reset : onClose}
            className="flex-1"
          >
            {primaryId || secondaryId ? "Reset" : "Cancel"}
          </Button>
          <Button
            onClick={handleMerge}
            disabled={!primaryId || !secondaryId}
            loading={mergeContacts.isPending}
            className="flex-1"
          >
            Merge Contacts
          </Button>
        </div>
      </div>
    </div>
  );
}

function ContactSlot({
  label,
  contact,
  active,
  onClick,
  onClear,
}: {
  label: string;
  contact: Contact | null;
  active: boolean;
  onClick: () => void;
  onClear: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl border px-3 py-2.5 text-left transition-colors ${
        active
          ? "border-primary/40 bg-primary/5"
          : "border-outline-variant/15 bg-surface-container-low"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-on-surface-variant/50 mb-1">
        {label}
      </p>
      {contact ? (
        <div className="flex items-center gap-2">
          <Avatar
            name={contact.name || contact.phoneNumber}
            src={contact.avatarUrl}
            size="sm"
          />
          <p className="text-[12px] font-medium text-on-surface truncate flex-1">
            {contact.name || contact.phoneNumber}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="p-0.5 rounded hover:bg-surface-container transition-colors"
          >
            <X className="h-3 w-3 text-on-surface-variant" />
          </button>
        </div>
      ) : (
        <p className="text-[12px] text-on-surface-variant/40">Select...</p>
      )}
    </button>
  );
}
