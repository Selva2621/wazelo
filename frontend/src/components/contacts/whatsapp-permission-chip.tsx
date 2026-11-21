"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, HelpCircle, ShieldCheck, ShieldOff } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRevokeWhatsAppPermission, useWhatsAppPermission } from "@/hooks/use-contacts";
import { cn } from "@/lib/utils";
import type { WhatsAppPermissionStatus } from "@/lib/types/contacts";
import { RecordWhatsAppPermissionModal } from "./record-whatsapp-permission-modal";

const CHIP: Record<Exclude<WhatsAppPermissionStatus, "not_required">, { label: string; tone: string }> = {
  not_yet: { label: "Not yet on WhatsApp", tone: "bg-warning-container text-warning" },
  agreed: { label: "Agreed to WhatsApp", tone: "bg-success-container text-success" },
  messaged_first: { label: "Messaged you first", tone: "bg-success-container text-success" },
};

const HOW_LABEL: Record<string, string> = {
  call: "on a call",
  email: "by email",
  in_person: "in person",
  other: "another way",
};

/** Same words wherever the rule is explained */
export const WHATSAPP_PERMISSION_WHY =
  "WhatsApp only allows messages to people who agreed to hear from you. Campaigns, sequences and automations skip this contact until then. Manual messages from the inbox still work.";

/**
 * Header chip for lead finder contacts: permission status, with a menu to record or
 * revoke permission and a short explanation. Renders nothing for other contacts.
 */
export function WhatsAppPermissionChip({ contactId }: { contactId: string }) {
  const { data } = useWhatsAppPermission(contactId);
  const revoke = useRevokeWhatsAppPermission();
  const [open, setOpen] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!data?.required || data.status === "not_required") return null;
  const chip = CHIP[data.status];
  const agreement = data.agreement;

  const toggle = () => {
    setShowWhy(false);
    setOpen((v) => !v);
  };

  return (
    <div ref={rootRef} className="relative inline-flex max-sm:static">
      <button
        type="button"
        data-tour="contact-wa-permission"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex h-6 shrink-0 items-center gap-1 rounded-full pl-2.5 pr-1.5 text-caption font-medium outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-focus",
          chip.tone,
        )}
      >
        {chip.label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="WhatsApp permission"
          className="absolute left-0 top-full z-30 mt-1.5 w-72 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-1 shadow-popover max-sm:inset-x-4 max-sm:w-auto"
        >
          {agreement && data.status === "agreed" && (
            <p className="px-2.5 pb-1.5 pt-2 text-caption text-on-surface-variant">
              Agreed {HOW_LABEL[agreement.how] ?? agreement.how} on{" "}
              {new Date(agreement.grantedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {agreement.note ? `: ${agreement.note}` : ""}
            </p>
          )}
          {data.status === "not_yet" && (
            <MenuItem
              onClick={() => {
                setOpen(false);
                setRecordOpen(true);
              }}
            >
              <ShieldCheck className="h-4 w-4 text-on-surface-variant" aria-hidden />
              Record permission
            </MenuItem>
          )}
          {data.status === "agreed" && (
            <MenuItem
              onClick={() => {
                setOpen(false);
                setRevokeOpen(true);
              }}
            >
              <ShieldOff className="h-4 w-4 text-on-surface-variant" aria-hidden />
              Revoke permission
            </MenuItem>
          )}
          <MenuItem onClick={() => setShowWhy((v) => !v)} expanded={showWhy}>
            <HelpCircle className="h-4 w-4 text-on-surface-variant" aria-hidden />
            Why is this needed?
          </MenuItem>
          {showWhy && (
            <p className="px-2.5 pb-2 pt-1 text-label leading-relaxed text-on-surface-variant">{WHATSAPP_PERMISSION_WHY}</p>
          )}
        </div>
      )}

      <RecordWhatsAppPermissionModal contactId={contactId} open={recordOpen} onClose={() => setRecordOpen(false)} />

      <ConfirmDialog
        open={revokeOpen}
        title="Revoke WhatsApp permission"
        message="Campaigns, sequences and automations will skip this contact again until they message you or you record permission."
        confirmLabel="Revoke"
        variant="danger"
        loading={revoke.isPending}
        onConfirm={() => revoke.mutate(contactId, { onSuccess: () => setRevokeOpen(false) })}
        onCancel={() => setRevokeOpen(false)}
      />
    </div>
  );
}

function MenuItem({
  onClick,
  expanded,
  children,
}: {
  onClick: () => void;
  expanded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      aria-expanded={expanded}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-body text-on-surface transition-colors hover:bg-surface-container focus-visible:bg-surface-container"
    >
      {children}
    </button>
  );
}
