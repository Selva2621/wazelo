import { z } from "zod";

/** Digits with optional "+" and spacing — the backend adds the country code and checks the number */
const PHONE_REGEX = /^\+?[\d\s().-]{7,20}$/;

export const createContactSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .regex(PHONE_REGEX, "Enter a valid phone number (e.g. 98765 43210)"),
  /** Country of a number typed without a country code */
  country: z.string().length(2).optional(),
  name: z.string().max(255, "Name must be 255 characters or less").optional(),
  email: z
    .string()
    .email("Enter a valid email")
    .max(320)
    .optional()
    .or(z.literal("")),
  source: z.enum(["WHATSAPP", "MANUAL", "IMPORT", "API"]).optional(),
  ownerId: z.string().uuid().optional(),
});

export const updateContactSchema = z.object({
  name: z.string().max(255).optional(),
  email: z
    .string()
    .email("Enter a valid email")
    .max(320)
    .optional()
    .or(z.literal("")),
  avatarUrl: z
    .string()
    .url("Enter a valid URL")
    .max(2048)
    .optional()
    .or(z.literal("")),
});

export const changeLeadStatusSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "INTERESTED", "CONVERTED", "CLOSED"]),
  reason: z.string().max(500).optional(),
});

export const assignContactSchema = z.object({
  ownerId: z.string().uuid("Select a valid team member"),
  reason: z.string().max(500).optional(),
});

export const mergeContactsSchema = z.object({
  primaryContactId: z.string().uuid(),
  secondaryContactId: z.string().uuid(),
});

export const addNoteSchema = z.object({
  content: z
    .string()
    .min(1, "Note content is required")
    .max(10000, "Note must be 10,000 characters or less"),
});

export const addTagSchema = z.object({
  name: z
    .string()
    .min(1, "Tag name is required")
    .max(100, "Tag name must be 100 characters or less")
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      "Only letters, numbers, spaces, hyphens, and underscores",
    ),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Enter a valid hex color (e.g. #FF5733)")
    .optional(),
});

export type CreateContactFormData = z.infer<typeof createContactSchema>;
export type UpdateContactFormData = z.infer<typeof updateContactSchema>;
export type ChangeLeadStatusFormData = z.infer<typeof changeLeadStatusSchema>;
export type AssignContactFormData = z.infer<typeof assignContactSchema>;
export type MergeContactsFormData = z.infer<typeof mergeContactsSchema>;
export type AddNoteFormData = z.infer<typeof addNoteSchema>;
export type AddTagFormData = z.infer<typeof addTagSchema>;

// ─── Record WhatsApp permission ───

export const recordWhatsAppPermissionSchema = z.object({
  how: z.enum(["call", "email", "in_person", "other"], { message: "Pick how they agreed" }),
  note: z.string().trim().max(500, "Keep the note under 500 characters").optional(),
});

export type RecordWhatsAppPermissionFormData = z.infer<typeof recordWhatsAppPermissionSchema>;

// Lead finder import: "Have they agreed to WhatsApp messages?" (how only needed for yes)
export const importLeadsPermissionSchema = z
  .object({
    agreed: z.enum(["no", "yes"]),
    how: recordWhatsAppPermissionSchema.shape.how.optional(),
    note: recordWhatsAppPermissionSchema.shape.note,
  })
  .superRefine((data, ctx) => {
    if (data.agreed === "yes" && !data.how) {
      ctx.addIssue({ code: "custom", path: ["how"], message: "Pick how they agreed" });
    }
  });

export type ImportLeadsPermissionFormData = z.infer<typeof importLeadsPermissionSchema>;
