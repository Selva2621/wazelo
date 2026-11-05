import { z } from "zod";

export const audienceFiltersSchema = z.object({
  contactIds: z.array(z.string().uuid()).optional(),
  leadStatuses: z.array(z.string()).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  ownerIds: z.array(z.string().uuid()).optional(),
  sources: z.array(z.string()).optional(),
  productIds: z.array(z.string().uuid()).optional(),
  scrapeRunId: z.string().uuid().optional(),
  hasPhone: z.boolean().optional(),
  hasWebsite: z.boolean().optional(),
  minRating: z.number().optional(),
  dateAdded: z.enum(['last_7d', 'last_30d', 'last_90d']).optional(),
});

export const createCampaignSchema = z
  .object({
    name: z
      .string()
      .min(1, "Campaign name is required")
      .max(255, "Name must be 255 characters or less"),
    description: z.string().max(2000).optional().or(z.literal("")),
    channel: z.enum(["WHATSAPP", "EMAIL"]),
    emailSubject: z.string().max(255, "Subject must be 255 characters or less").optional().or(z.literal("")),
    messageType: z.enum(["TEXT", "IMAGE", "VIDEO", "DOCUMENT", "AUDIO"]),
    messageBody: z.string().max(20000, "Message must be 20,000 characters or less").optional().or(z.literal("")),
    mediaUrl: z.string().url("Enter a valid URL").max(2048).optional().or(z.literal("")),
    mediaMimeType: z.string().max(100).optional().or(z.literal("")),
    audienceType: z.enum(["ALL", "FILTERED"]),
    audienceFilters: audienceFiltersSchema.optional(),
    sessionId: z.string().optional().or(z.literal("")),
    sessionIds: z.array(z.string().uuid()).default([]),
    scheduledAt: z.string().optional().or(z.literal("")),
    timezone: z.string().max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.channel === "EMAIL") {
      if (!data.emailSubject?.trim()) {
        ctx.addIssue({ code: "custom", message: "Add a subject", path: ["emailSubject"] });
      }
      if (!data.messageBody?.trim()) {
        ctx.addIssue({ code: "custom", message: "Write the email", path: ["messageBody"] });
      }
      return;
    }
    if (data.sessionIds.length === 0 && !data.sessionId) {
      ctx.addIssue({ code: "custom", message: "Select at least one WhatsApp session", path: ["sessionIds"] });
    }
    if ((data.messageBody?.length ?? 0) > 4096) {
      ctx.addIssue({ code: "custom", message: "Message must be 4,096 characters or less", path: ["messageBody"] });
    }
    if (data.messageType === "TEXT" && !data.messageBody) {
      ctx.addIssue({ code: "custom", message: "Message body is required for text messages", path: ["messageBody"] });
    }
    if (data.messageType !== "TEXT" && !data.mediaUrl) {
      ctx.addIssue({ code: "custom", message: "Upload a file or paste a URL", path: ["mediaUrl"] });
    }
  });

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

export type CreateCampaignFormInput = z.input<typeof createCampaignSchema>;
export type CreateCampaignFormData = z.output<typeof createCampaignSchema>;
export type UpdateCampaignFormData = z.infer<typeof updateCampaignSchema>;
export type ScheduleCampaignFormData = z.infer<typeof scheduleCampaignSchema>;
