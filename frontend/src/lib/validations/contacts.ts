import { z } from "zod";

const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

export const createContactSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .regex(PHONE_REGEX, "Enter a valid phone number (e.g. +1234567890)"),
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
