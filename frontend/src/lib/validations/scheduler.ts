import { z } from "zod";

export const createScheduledMessageSchema = z
  .object({
    sessionId: z.string().uuid("Select a WhatsApp session"),
    contactPhone: z
      .string()
      .min(1, "Phone number is required")
      .regex(/^\+\d{7,15}$/, "Enter a valid phone number (e.g. +1234567890)"),
    messageType: z.enum(["TEXT", "IMAGE", "VIDEO", "DOCUMENT", "AUDIO"]),
    messageBody: z.string().max(4096).optional().or(z.literal("")),
    mediaUrl: z
      .string()
      .url("Enter a valid URL")
      .max(2048)
      .optional()
      .or(z.literal("")),
    mediaMimeType: z.string().max(100).optional().or(z.literal("")),
    scheduledAt: z.string().min(1, "Scheduled date & time is required"),
    timezone: z.string().max(100).optional(),
  })
  .refine(
    (data) => {
      if (data.messageType === "TEXT") return !!data.messageBody;
      return true;
    },
    {
      message: "Message body is required for text messages",
      path: ["messageBody"],
    },
  )
  .refine(
    (data) => {
      if (data.messageType !== "TEXT") return !!data.mediaUrl;
      return true;
    },
    {
      message: "Media URL is required for media messages",
      path: ["mediaUrl"],
    },
  );

export const updateScheduledMessageSchema = z.object({
  messageType: z
    .enum(["TEXT", "IMAGE", "VIDEO", "DOCUMENT", "AUDIO"])
    .optional(),
  messageBody: z.string().max(4096).optional().or(z.literal("")),
  mediaUrl: z.string().url().max(2048).optional().or(z.literal("")),
  mediaMimeType: z.string().max(100).optional().or(z.literal("")),
  scheduledAt: z.string().optional(),
  timezone: z.string().max(100).optional(),
});

export type CreateScheduledMessageFormData = z.infer<
  typeof createScheduledMessageSchema
>;
export type UpdateScheduledMessageFormData = z.infer<
  typeof updateScheduledMessageSchema
>;
