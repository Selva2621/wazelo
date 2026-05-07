import { z } from "zod";

const triggerConfigSchema = z.object({
  messageKeyword: z.string().optional().or(z.literal("")),
  fromStatus: z.string().optional().or(z.literal("")),
  toStatus: z.string().optional().or(z.literal("")),
  cronExpression: z.string().optional().or(z.literal("")),
  delaySeconds: z.number().int().min(0).optional(),
  minOrderValue: z.number().min(0).optional(),
  minCartValue: z.number().min(0).optional(),
});

const conditionSchema = z.object({
  field: z.string().min(1, "Field is required"),
  operator: z.enum(["EQUALS", "NOT_EQUALS", "CONTAINS", "IN", "NOT_IN"]),
  value: z.any(),
});

const actionSchema = z.object({
  actionType: z.enum([
    "SEND_MESSAGE",
    "ASSIGN_CONTACT",
    "ADD_TAG",
    "UPDATE_STATUS",
  ]),
  actionConfig: z.record(z.string(), z.any()),
  orderIndex: z.number().int().min(0).optional(),
  delaySeconds: z.number().int().min(0).optional(),
});

export const createAutomationRuleSchema = z.object({
  name: z
    .string()
    .min(1, "Rule name is required")
    .max(255, "Name must be 255 characters or less"),
  description: z.string().max(2000).optional().or(z.literal("")),
  triggerType: z.enum([
    "MESSAGE_RECEIVED",
    "CONTACT_CREATED",
    "LEAD_STATUS_CHANGED",
    "TIME_BASED",
    "NO_REPLY",
    "LEAD_AD_RECEIVED",
    "SHOPIFY_ORDER_CREATED",
    "SHOPIFY_ORDER_FULFILLED",
    "SHOPIFY_CART_ABANDONED",
    "WIDGET_MESSAGE_RECEIVED",
  ]),
  triggerConfig: triggerConfigSchema,
  conditions: z.array(conditionSchema).optional(),
  actions: z.array(actionSchema).min(1, "At least one action is required"),
  priority: z.number().int().min(0).optional(),
  maxExecutionsPerContact: z.number().int().min(0).optional(),
  cooldownSeconds: z.number().int().min(0).optional(),
});

export const updateAutomationRuleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().or(z.literal("")),
  triggerType: z
    .enum([
      "MESSAGE_RECEIVED",
      "CONTACT_CREATED",
      "LEAD_STATUS_CHANGED",
      "TIME_BASED",
      "NO_REPLY",
      "LEAD_AD_RECEIVED",
      "SHOPIFY_ORDER_CREATED",
      "SHOPIFY_ORDER_FULFILLED",
      "SHOPIFY_CART_ABANDONED",
    ])
    .optional(),
  triggerConfig: triggerConfigSchema.optional(),
  conditions: z.array(conditionSchema).optional(),
  actions: z.array(actionSchema).optional(),
  priority: z.number().int().min(0).optional(),
  maxExecutionsPerContact: z.number().int().min(0).optional(),
  cooldownSeconds: z.number().int().min(0).optional(),
});

export type CreateAutomationRuleFormData = z.infer<
  typeof createAutomationRuleSchema
>;
export type UpdateAutomationRuleFormData = z.infer<
  typeof updateAutomationRuleSchema
>;
