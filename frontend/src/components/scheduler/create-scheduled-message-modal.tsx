"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateScheduledMessage } from "@/hooks/use-scheduler";
import { ProductSelectField } from "@/components/ui/product-select-field";
import { MediaPicker, mediaKindFor } from "@/components/ui/media-picker";
import {
  createScheduledMessageSchema,
  type CreateScheduledMessageFormData,
} from "@/lib/validations/scheduler";
import type { MessageType } from "@/lib/types/scheduler";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";

interface CreateScheduledMessageModalProps {
  open: boolean;
  onClose: () => void;
  sessions: { id: string; name: string; status: string }[];
}

const MESSAGE_TYPES: { value: MessageType; label: string }[] = [
  { value: "TEXT", label: "Text" },
  { value: "IMAGE", label: "Image" },
  { value: "VIDEO", label: "Video" },
  { value: "DOCUMENT", label: "Document" },
  { value: "AUDIO", label: "Audio" },
];

export function CreateScheduledMessageModal({
  open,
  onClose,
  sessions,
}: CreateScheduledMessageModalProps) {
  const createMessage = useCreateScheduledMessage();
  const [productId, setProductId] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateScheduledMessageFormData>({
    resolver: zodResolver(createScheduledMessageSchema),
    defaultValues: {
      messageType: "TEXT",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  const messageType = watch("messageType") as MessageType;
  const mediaUrl = watch("mediaUrl");

  // A file picked for one type doesn't fit another
  const typeField = register("messageType");
  const onTypeChange: typeof typeField.onChange = (e) => {
    setValue("mediaUrl", "");
    setValue("mediaMimeType", "");
    return typeField.onChange(e);
  };

  function onSubmit(data: CreateScheduledMessageFormData) {
    createMessage.mutate({ ...data, productId: productId || undefined }, {
      onSuccess: () => {
        reset();
        setProductId("");
        onClose();
      },
    });
  }

  function handleClose() {
    reset();
    setProductId("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="schedule-message-title"
      className="max-w-lg bg-surface-container"
    >
      {() => (
      <>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15">
          <h2 id="schedule-message-title" className="text-title-sm font-semibold text-on-surface">
            Schedule Message
          </h2>
          <IconButton size="sm"
            onClick={handleClose} aria-label="Close">
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          {/* Session */}
          <div>
            <Label htmlFor="sessionId">WhatsApp Session</Label>
            <select
              id="sessionId"
              {...register("sessionId")}
              className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-body-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select session...</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.sessionId && (
              <p className="mt-1 text-label text-error">
                {errors.sessionId.message}
              </p>
            )}
          </div>

          {/* Contact Phone */}
          <div>
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input
              id="contactPhone"
              placeholder="+1234567890"
              error={errors.contactPhone?.message}
              {...register("contactPhone")}
            />
          </div>

          {/* Message Type */}
          <div>
            <Label htmlFor="messageType">Message Type</Label>
            <select
              id="messageType"
              {...typeField}
              onChange={onTypeChange}
              className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-body-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {MESSAGE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Message Body (for TEXT) */}
          {messageType === "TEXT" && (
            <div>
              <Label htmlFor="messageBody">Message Body</Label>
              <textarea
                id="messageBody"
                rows={3}
                placeholder="Type your message..."
                {...register("messageBody")}
                className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-body-lg text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              {errors.messageBody && (
                <p className="mt-1 text-label text-error">
                  {errors.messageBody.message}
                </p>
              )}
            </div>
          )}

          {/* Media (for non-TEXT): the file's type comes from the upload */}
          {messageType !== "TEXT" && (
            <div>
              <Label htmlFor="mediaUrl">Media</Label>
              <MediaPicker
                id="mediaUrl"
                kind={mediaKindFor(messageType)}
                value={mediaUrl ?? ""}
                error={errors.mediaUrl?.message}
                onChange={(url, media) => {
                  setValue("mediaUrl", url, { shouldValidate: true });
                  setValue("mediaMimeType", media?.mimeType ?? "");
                }}
              />
            </div>
          )}

          {/* Scheduled At */}
          <div>
            <Label htmlFor="scheduledAt">Scheduled At</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              error={errors.scheduledAt?.message}
              {...register("scheduledAt")}
            />
          </div>

          {/* Product */}
          <ProductSelectField
            value={productId}
            onChange={setProductId}
            onBeforeRedirect={onClose}
          />

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 max-lg:[&>button]:flex-1">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createMessage.isPending}>
              Schedule
            </Button>
          </div>
        </form>
      </>
      )}
    </Modal>
  );
}
