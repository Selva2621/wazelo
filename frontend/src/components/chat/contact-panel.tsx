"use client";

import { useState, useRef, useEffect } from "react";
import { X, Phone, Mail, Tag, StickyNote, UserCircle, ChevronDown, Check, UserCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/lib/types/contacts";

export interface OrgUserOption {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface ContactInfo {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string | null;
  leadStatus: LeadStatus;
  tags: string[];
  notes: string;
  assignedTo?: string;
}

interface ContactPanelProps {
  contact: ContactInfo;
  onClose: () => void;
  onStatusChange?: (contactId: string, status: LeadStatus) => void;
  isUpdatingStatus?: boolean;
  /** Conversation-level assignment (not contact owner) */
  conversationAssignedToId?: string | null;
  orgUsers?: OrgUserOption[];
  canAssign?: boolean;
  isAssigning?: boolean;
  onAssign?: (assignedToId: string | null) => void;
}

const LEAD_STATUSES: { value: LeadStatus; label: string; dot: string }[] = [
  { value: "NEW", label: "New", dot: "bg-blue-500" },
  { value: "CONTACTED", label: "Contacted", dot: "bg-primary" },
  { value: "INTERESTED", label: "Interested", dot: "bg-amber-500" },
  { value: "CONVERTED", label: "Converted", dot: "bg-emerald-500" },
  { value: "CLOSED", label: "Cancelled", dot: "bg-red-500" },
];

const statusVariant: Record<LeadStatus, "info" | "primary" | "warning" | "success" | "error"> = {
  NEW: "info",
  CONTACTED: "primary",
  INTERESTED: "warning",
  CONVERTED: "success",
  CLOSED: "error",
};

export function ContactPanel({
  contact,
  onClose,
  onStatusChange,
  isUpdatingStatus,
  conversationAssignedToId,
  orgUsers = [],
  canAssign = false,
  isAssigning = false,
  onAssign,
}: ContactPanelProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const assignDropdownRef = useRef<HTMLDivElement>(null);

  // Close status dropdown on outside click
  useEffect(() => {
    if (!statusOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [statusOpen]);

  // Close assign dropdown on outside click
  useEffect(() => {
    if (!assignOpen) return;
    function handleClick(e: MouseEvent) {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(e.target as Node)) {
        setAssignOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [assignOpen]);

  const assignedUser = conversationAssignedToId
    ? orgUsers.find((u) => u.id === conversationAssignedToId)
    : null;
  const assignedLabel = assignedUser
    ? `${assignedUser.firstName} ${assignedUser.lastName}`
    : "Unassigned";

  const currentStatusConfig = LEAD_STATUSES.find((s) => s.value === contact.leadStatus) ?? LEAD_STATUSES[0];

  return (
    <div className="flex h-full flex-col bg-surface-container-lowest">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/15">
        <span className="text-[14px] font-semibold text-on-surface">
          Contact Info
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Profile */}
        <div className="flex flex-col items-center text-center">
          <Avatar name={contact.name} src={contact.avatar} size="lg" />
          <h3 className="mt-3 text-[16px] font-semibold text-on-surface">
            {contact.name}
          </h3>
          <Badge
            variant={statusVariant[contact.leadStatus] ?? "muted"}
            className="mt-1.5 capitalize"
          >
            {currentStatusConfig.label}
          </Badge>
        </div>

        {/* Lead Status Selector */}
        <div>
          <span className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wide">
            Lead Status
          </span>
          <div className="relative mt-1.5" ref={dropdownRef}>
            <button
              onClick={() => setStatusOpen((v) => !v)}
              disabled={isUpdatingStatus}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border transition-colors",
                "border-outline-variant/20 hover:border-outline-variant/40",
                "bg-surface-container text-on-surface text-[13px] font-medium",
                isUpdatingStatus && "opacity-60 cursor-not-allowed",
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", currentStatusConfig.dot)} />
                <span>{currentStatusConfig.label}</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-on-surface-variant transition-transform", statusOpen && "rotate-180")} />
            </button>

            {statusOpen && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 py-1 rounded-lg border border-outline-variant/20 bg-surface-container-low shadow-lg">
                {LEAD_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => {
                      if (s.value !== contact.leadStatus && onStatusChange) {
                        onStatusChange(contact.id, s.value);
                      }
                      setStatusOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors",
                      "hover:bg-surface-container",
                      s.value === contact.leadStatus ? "text-primary font-medium" : "text-on-surface",
                    )}
                  >
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", s.dot)} />
                    <span className="flex-1 text-left">{s.label}</span>
                    {s.value === contact.leadStatus && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conversation Assignment */}
        <div>
          <span className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wide">
            Assigned To
          </span>
          {canAssign ? (
            <div className="relative mt-1.5" ref={assignDropdownRef}>
              <button
                onClick={() => setAssignOpen((v) => !v)}
                disabled={isAssigning}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border transition-colors",
                  "border-outline-variant/20 hover:border-outline-variant/40",
                  "bg-surface-container text-on-surface text-[13px] font-medium",
                  isAssigning && "opacity-60 cursor-not-allowed",
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <UserCheck className="h-4 w-4 text-on-surface-variant shrink-0" />
                  <span className={cn("truncate", !conversationAssignedToId && "text-on-surface-variant/60")}>
                    {assignedLabel}
                  </span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-on-surface-variant shrink-0 transition-transform", assignOpen && "rotate-180")} />
              </button>

              {assignOpen && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 py-1 rounded-lg border border-outline-variant/20 bg-surface-container-low shadow-lg max-h-48 overflow-y-auto">
                  <button
                    onClick={() => {
                      onAssign?.(null);
                      setAssignOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-surface-container",
                      !conversationAssignedToId ? "text-primary font-medium" : "text-on-surface-variant",
                    )}
                  >
                    <span className="flex-1 text-left">Unassigned</span>
                    {!conversationAssignedToId && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                  {orgUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        onAssign?.(u.id);
                        setAssignOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-surface-container",
                        u.id === conversationAssignedToId ? "text-primary font-medium" : "text-on-surface",
                      )}
                    >
                      <Avatar name={`${u.firstName} ${u.lastName}`} size="sm" />
                      <span className="flex-1 text-left truncate">{u.firstName} {u.lastName}</span>
                      {u.id === conversationAssignedToId && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-1.5 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface-container text-[13px] text-on-surface-variant/70">
              <UserCheck className="h-4 w-4 shrink-0" />
              <span>{assignedLabel}</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-3">
          <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone" value={contact.phone} />
          {contact.email && (
            <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={contact.email} />
          )}
          {contact.assignedTo && (
            <DetailRow icon={<UserCircle className="h-4 w-4" />} label="Owner" value={contact.assignedTo} />
          )}
        </div>

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Tag className="h-3.5 w-3.5 text-on-surface-variant" />
              <span className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wide">
                Tags
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((tag) => (
                <Badge key={tag} variant="muted">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {contact.notes && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <StickyNote className="h-3.5 w-3.5 text-on-surface-variant" />
              <span className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wide">
                Notes
              </span>
            </div>
            <p className="text-[13px] text-on-surface-variant leading-relaxed">
              {contact.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-on-surface-variant">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-on-surface-variant/60 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-[13px] text-on-surface truncate">{value}</p>
      </div>
    </div>
  );
}
