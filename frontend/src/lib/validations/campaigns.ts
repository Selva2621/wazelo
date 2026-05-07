import { z } from "zod";

export const audienceFiltersSchema = z.object({
  leadStatuses: z.array(z.string()).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  ownerIds: z.array(z.string().uuid()).optional(),
  sources: z.array(z.string()).optional(),
});

export const createCampaignSchema = z
  .object({
    name: z
      .string()
      .min(1, "Campaign name is required")
      .max(255, "Name must be 255 characters or less"),
    description: z.string().max(2000).optional().or(z.literal("")),
    messageType: z.enum(["TEXT", "IMAGE", "VIDEO", "DOCUMENT", "AUDIO"]),
    messageBody: z.string().max(4096).optional().or(z.literal("")),
    mediaUrl: z.string().url("Enter a valid URL").max(2048).optional().or(z.literal("")),
    mediaMimeType: z.string().max(100).optional().or(z.literal("")),
    audienceType: z.enum(["ALL", "FILTERED"]),
    audienceFilters: audienceFiltersSchema.optional(),
    sessionId: z.string().uuid("Select a WhatsApp session"),
    scheduledAt: z.string().optional().or(z.literal("")),
    timezone: z.string().max(100).optional(),
  })
  .refine(
    (data) => {
      if (data.messageType === "TEXT") return !!data.messageBody;
      return true;
    },
    { message: "Message body is required for text messages", path: ["messageBody"] },
  )
  .refine(
    (data) => {
      if (data.messageType !== "TEXT") return !!data.mediaUrl;
      return true;
    },
    { message: "Media URL is required for media messages", path: ["mediaUrl"] },
  );

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().or(z.literal("")),
  messageType: z.enum(["TEXT", "IMAGE", "VIDEO", "DOCUMENT", "AUDIO"]).optional(),
  messageBody: z.string().max(4096).optional().or(z.literal("")),
  mediaUrl: z.string().url().max(2048).optional().or(z.literal("")),
  mediaMimeType: z.string().max(100).optional().or(z.literal("")),
  audienceType: z.enum(["ALL", "FILTERED"]).optional(),
  audienceFilters: audienceFiltersSchema.optional(),
  sessionId: z.string().uuid().optional(),
});

export const scheduleCampaignSchema = z.object({
  scheduledAt: z.string().min(1, "Scheduled date is required"),
  timezone: z.string().max(100).optional(),
});

export type CreateCampaignFormData = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignFormData = z.infer<typeof updateCampaignSchema>;
export type ScheduleCampaignFormData = z.infer<typeof scheduleCampaignSchema>;
