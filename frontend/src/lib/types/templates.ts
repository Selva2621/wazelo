export type TemplateStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface MessageTemplate {
  id: string;
  orgId: string;
  channelId: string | null;
  name: string;
  language: string;
  category: string | null;
  status: TemplateStatus;
  whatsappTemplateId: string | null;
  components: TemplateComponent[];
  exampleValues: Record<string, string> | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  text?: string;
  format?: string;
  example?: { body_text?: string[][] };
}

export interface SendTemplateRequest {
  channelId: string;
  templateId: string;
  contactPhone: string;
  variables?: Record<string, string>;
  conversationId?: string;
  idempotencyKey?: string;
}

export interface CreateTemplateRequest {
  name: string;
  body: string;
  category?: string;
  language?: string;
  productId?: string;
}

export interface UpdateTemplateRequest {
  name?: string;
  body?: string;
  category?: string;
  language?: string;
  productId?: string | null;
}

export const TEMPLATE_STATUS_LABELS: Record<TemplateStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};
