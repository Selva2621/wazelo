"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useController, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { WhatsAppPermissionFields } from "@/components/contacts/whatsapp-permission-fields";
import { cn } from "@/lib/utils";
import {
  importLeadsPermissionSchema,
  type ImportLeadsPermissionFormData,
} from "@/lib/validations/contacts";
import type { RecordWhatsAppPermissionRequest } from "@/lib/types/contacts";

const AGREED_OPTIONS: { value: ImportLeadsPermissionFormData["agreed"]; label: string }[] = [
  { value: "no", label: "Not yet, just import" },
  { value: "yes", label: "Yes, they agreed" },
];

interface ImportLeadsModalProps {
  open: boolean;
  onClose: () => void;
  count: number;
  pending: boolean;
  /** permission is set only when "Yes, they agreed" was picked */
  onImport: (permission?: RecordWhatsAppPermissionRequest) => void;
}

/** Before importing lead finder results: did they agree to WhatsApp messages? */
export function ImportLeadsModal({ open, onClose, count, pending, onImport }: ImportLeadsModalProps) {
  const { control, handleSubmit, reset } = useForm<ImportLeadsPermissionFormData>({
    resolver: zodResolver(importLeadsPermissionSchema),
    defaultValues: { agreed: "no", how: undefined, note: "" },
  });
  const agreedField = useController({ control, name: "agreed" });
  const agreed = agreedField.field.value;
  const how = useController({ control, name: "how" });
  const note = useController({ control, name: "note" });

  // Fresh form each time it opens
  useEffect(() => {
    if (open) reset({ agreed: "no", how: undefined, note: "" });
  }, [open, reset]);

  const onSubmit = (data: ImportLeadsPermissionFormData) => {
    onImport(
      data.agreed === "yes" && data.how
        ? { how: data.how, note: data.note?.trim() || undefined }
        : undefined,
    );
  };

  const leads = `${count} lead${count !== 1 ? "s" : ""}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!pending}
      aria-labelledby="import-leads-title"
      className="max-w-md p-6"
    >
      {() => (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-4 flex items-center justify-between">
            <h2 id="import-leads-title" className="text-title-sm font-semibold text-on-surface">
              Import {leads}
            </h2>
            <IconButton size="xs" onClick={onClose} aria-label="Close" disabled={pending}>
              <X className="h-4 w-4" />
            </IconButton>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-body font-medium text-on-surface">
              Have they agreed to WhatsApp messages?
            </legend>
            {AGREED_OPTIONS.map((o) => {
              const selected = agreed === o.value;
              return (
                <label
                  key={o.value}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-body transition-colors",
                    selected
                      ? "border-primary bg-primary/5 text-on-surface"
                      : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low",
                  )}
                >
                  <input
                    type="radio"
                    name={agreedField.field.name}
                    value={o.value}
                    checked={selected}
                    onChange={() => agreedField.field.onChange(o.value)}
                    className="h-4 w-4 accent-primary"
                  />
                  {o.label}
                </label>
              );
            })}
          </fieldset>

          {agreed === "yes" && (
            <div className="mt-4 border-l-2 border-outline-variant pl-4">
              <WhatsAppPermissionFields
                idPrefix="import-wa-permission"
                howLabel="How"
                how={how.field.value}
                onHowChange={how.field.onChange}
                note={note.field.value ?? ""}
                onNoteChange={note.field.onChange}
                howError={how.fieldState.error?.message}
                noteError={note.fieldState.error?.message}
              />
            </div>
          )}

          <ModalFooter className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Import {count}
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
