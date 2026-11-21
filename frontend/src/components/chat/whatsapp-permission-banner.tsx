"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { RecordWhatsAppPermissionModal } from "@/components/contacts/record-whatsapp-permission-modal";
import { useWhatsAppPermission } from "@/hooks/use-contacts";

/**
 * Slim warning above the composer for a lead finder contact who hasn't agreed to
 * WhatsApp messages yet. Sending is not blocked: the member may have just called them.
 */
export function WhatsAppPermissionBanner({ contactId }: { contactId: string }) {
  const { data } = useWhatsAppPermission(contactId);
  const [recordOpen, setRecordOpen] = useState(false);

  if (!data?.required || data.status !== "not_yet") return null;

  return (
    <>
      <div
        data-tour="chat-wa-permission"
        role="status"
        className="flex shrink-0 items-center gap-2 border-t border-warning/20 bg-warning-container px-4 py-2 text-label text-warning max-lg:px-3"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1">
          This lead finder contact hasn&apos;t agreed to WhatsApp messages yet. Only message them if they asked you to.
        </p>
        <button
          type="button"
          onClick={() => setRecordOpen(true)}
          className="shrink-0 rounded font-medium underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
        >
          Record permission
        </button>
      </div>
      <RecordWhatsAppPermissionModal contactId={contactId} open={recordOpen} onClose={() => setRecordOpen(false)} />
    </>
  );
}
