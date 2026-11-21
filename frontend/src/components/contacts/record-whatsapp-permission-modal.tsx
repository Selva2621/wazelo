"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useController, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { useBulkRecordWhatsAppPermission, useRecordWhatsAppPermission } from "@/hooks/use-contacts";
import {
  recordWhatsAppPermissionSchema,
  type RecordWhatsAppPermissionFormData,
} from "@/lib/validations/contacts";
import { WhatsAppPermissionFields } from "./whatsapp-permission-fields";

type RecordWhatsAppPermissionModalProps = {
  open: boolean;
  onClose: () => void;
} & (
  | { contactId: string; contactIds?: never }
  /** Bulk: the same agreement for several leads (lead finder run page) */
  | { contactIds: string[]; contactId?: never }
);

/** Record that lead finder contact(s) agreed to WhatsApp messages (call, email, in person, other). */
export function RecordWhatsAppPermissionModal({ contactId, contactIds, open, onClose }: RecordWhatsAppPermissionModalProps) {
  const record = useRecordWhatsAppPermission();
  const bulkRecord = useBulkRecordWhatsAppPermission();
  const isPending = record.isPending || bulkRecord.isPending;
  const {
    control,
    handleSubmit,
    reset,
  } = useForm<RecordWhatsAppPermissionFormData>({
    resolver: zodResolver(recordWhatsAppPermissionSchema),
    defaultValues: { how: undefined, note: "" },
  });
  const how = useController({ control, name: "how" });
  const note = useController({ control, name: "note" });

  // Fresh form each time it opens
  useEffect(() => {
    if (open) reset({ how: undefined, note: "" });
  }, [open, reset]);

  const onSubmit = (data: RecordWhatsAppPermissionFormData) => {
    const payload = { how: data.how, note: data.note?.trim() || undefined };
    if (contactIds) bulkRecord.mutate({ contactIds, ...payload }, { onSuccess: onClose });
    else record.mutate({ contactId, ...payload }, { onSuccess: onClose });
  };

  const title = contactIds
    ? `Record WhatsApp permission · ${contactIds.length} lead${contactIds.length !== 1 ? "s" : ""}`
    : "Record WhatsApp permission";

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!isPending}
      aria-labelledby="record-wa-permission-title"
      className="max-w-md p-6"
    >
      {() => (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-4 flex items-center justify-between">
            <h2 id="record-wa-permission-title" className="text-title-sm font-semibold text-on-surface">
              {title}
            </h2>
            <IconButton size="xs" onClick={onClose} aria-label="Close" disabled={isPending}>
              <X className="h-4 w-4" />
            </IconButton>
          </div>

          <WhatsAppPermissionFields
            idPrefix="wa-permission"
            how={how.field.value}
            onHowChange={how.field.onChange}
            note={note.field.value ?? ""}
            onNoteChange={note.field.onChange}
            howError={how.fieldState.error?.message}
            noteError={note.fieldState.error?.message}
          />

          <ModalFooter className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              Save
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
