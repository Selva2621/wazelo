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
import {
  createScheduledMessageSchema,
  type CreateScheduledMessageFormData,
} from "@/lib/validations/scheduler";
import type { MessageType } from "@/lib/types/scheduler";

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-surface-container rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15">
          <h2 className="text-[16px] font-semibold text-on-surface">
            Schedule Message
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          {/* Session */}
          <div>
            <Label htmlFor="sessionId">WhatsApp Session</Label>
            <select
              id="sessionId"
              {...register("sessionId")}
              className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-[14px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select session...</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.sessionId && (
              <p className="mt-1 text-[12px] text-error">
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
              {...register("messageType")}
              className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-[14px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-[14px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              {errors.messageBody && (
                <p className="mt-1 text-[12px] text-error">
                  {errors.messageBody.message}
                </p>
              )}
            </div>
          )}

          {/* Media URL (for non-TEXT) */}
          {messageType !== "TEXT" && (
            <>
              <div>
                <Label htmlFor="mediaUrl">Media URL</Label>
                <Input
                  id="mediaUrl"
                  placeholder="https://example.com/file.png"
                  error={errors.mediaUrl?.message}
                  {...register("mediaUrl")}
                />
              </div>
              <div>
                <Label htmlFor="mediaMimeType">MIME Type</Label>
                <Input
                  id="mediaMimeType"
                  placeholder="image/png"
                  error={errors.mediaMimeType?.message}
                  {...register("mediaMimeType")}
                />
              </div>
            </>
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
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createMessage.isPending}>
              Schedule
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
