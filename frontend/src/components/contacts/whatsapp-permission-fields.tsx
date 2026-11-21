"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { WhatsAppPermissionHow } from "@/lib/types/contacts";

export const WHATSAPP_PERMISSION_HOW_OPTIONS: { value: WhatsAppPermissionHow; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "in_person", label: "In person" },
  { value: "other", label: "Other" },
];

export const WHATSAPP_PERMISSION_NOTE_MAX = 500;

interface WhatsAppPermissionFieldsProps {
  /** Unique per dialog so labels and ids don't clash */
  idPrefix: string;
  how: WhatsAppPermissionHow | undefined;
  onHowChange: (how: WhatsAppPermissionHow) => void;
  note: string;
  onNoteChange: (note: string) => void;
  howError?: string;
  noteError?: string;
  /** Label for the chips (the import dialog says just "How") */
  howLabel?: string;
}

/** "How did they agree?" chips + optional note, shared by the WhatsApp permission dialogs. */
export function WhatsAppPermissionFields({
  idPrefix,
  how,
  onHowChange,
  note,
  onNoteChange,
  howError,
  noteError,
  howLabel = "How did they agree?",
}: WhatsAppPermissionFieldsProps) {
  const howLabelId = `${idPrefix}-how-label`;
  const noteId = `${idPrefix}-note`;
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label id={howLabelId} required>{howLabel}</Label>
        <div role="radiogroup" aria-labelledby={howLabelId} className="flex flex-wrap gap-2">
          {WHATSAPP_PERMISSION_HOW_OPTIONS.map((o) => {
            const selected = how === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onHowChange(o.value)}
                className={cn(
                  "h-8 rounded-full border px-3 text-body outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                  selected
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        {howError && <p className="text-label text-error">{howError}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor={noteId}>Note (optional)</Label>
        <textarea
          id={noteId}
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={3}
          maxLength={WHATSAPP_PERMISSION_NOTE_MAX}
          placeholder="For example: said yes on a call on Monday"
          className="w-full resize-none rounded-lg bg-surface-container-low px-3 py-2 text-body text-on-surface outline-none placeholder:text-placeholder focus:ring-1 focus:ring-primary/40"
        />
        <div className="flex justify-between text-caption text-on-surface-variant">
          <span className="text-error">{noteError}</span>
          <span className="tabular-nums">{note.length}/{WHATSAPP_PERMISSION_NOTE_MAX}</span>
        </div>
      </div>
    </div>
  );
}
