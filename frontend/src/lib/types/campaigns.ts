// ─── Enums (match backend Prisma enums) ───

export type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type CampaignAudienceType = "ALL" | "FILTERED";

export type CampaignRecipientStatus =
  | "PENDING"
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "FAILED"
  | "SKIPPED";

export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO";

// ─── Audience Filters ───

export interface AudienceFilters {
  leadStatuses?: string[];
  tagIds?: string[];
  ownerIds?: string[];
  sources?: string[];
}

// ─── Campaign ───

export interface Campaign {
  id: string;
  orgId: string;
  sessionId: string;
  name: string;
  description: string | null;
  messageType: MessageType;
  messageBody: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  audienceType: CampaignAudienceType;
  audienceFilters: AudienceFilters | null;
  status: CampaignStatus;
  scheduledAt: string | null;
  timezone: string;
  startedAt: string | null;
  completedAt: string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  readCount: number;
  createdById: string;
  idempotencyKey: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Campaign Recipient ───

export interface CampaignRecipient {
  id: string;
  campaignId: string;
  orgId: string;
  contactId: string;
  contactPhone: string;
  messageId: string | null;
  status: CampaignRecipientStatus;
  failedReason: string | null;
  processedAt: string | null;
  batchNumber: number;
  createdAt: string;
  contact?: {
    id: string;
    name: string | null;
    phoneNumber: string;
  };
}

// ─── Campaign Event ───

export interface CampaignEvent {
  id: string;
  campaignId: string;
  orgId: string;
  previousStatus: CampaignStatus | null;
  newStatus: CampaignStatus;
  triggeredById: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ─── List Response ───

export interface CampaignListResponse {
  data: Campaign[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RecipientListResponse {
  data: CampaignRecipient[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Recipient Status Counts ───

export interface RecipientStatusCounts {
  pending: number;
  queued: number;
  sent: number;
  delivered: number;
  failed: number;
  skipped: number;
}

// ─── Analytics ───

export interface CampaignAnalytics {
  campaign: Campaign;
  recipientCounts: RecipientStatusCounts;
  deliveryRate: number;
  failureRate: number;
  readRate: number;
  progress: number;
}

// ─── Audience Preview ───

export interface AudiencePreview {
  estimatedRecipients: number;
}

// ─── Request DTOs ───

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  messageType: MessageType;
  messageBody?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  audienceType: CampaignAudienceType;
  audienceFilters?: AudienceFilters;
  sessionId: string;
  scheduledAt?: string;
  timezone?: string;
  idempotencyKey?: string;
  productId?: string;
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  messageType?: MessageType;
  messageBody?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  audienceType?: CampaignAudienceType;
  audienceFilters?: AudienceFilters;
  sessionId?: string;
}

export interface ScheduleCampaignRequest {
  scheduledAt: string;
  timezone?: string;
}

// ─── Query Params ───

export interface ListCampaignsParams {
  page?: number;
  limit?: number;
  status?: CampaignStatus;
  sortBy?: "createdAt" | "updatedAt" | "scheduledAt";
  sortOrder?: "asc" | "desc";
}

export interface ListRecipientsParams {
  page?: number;
  limit?: number;
  status?: CampaignRecipientStatus;
}

// ─── WebSocket Progress Event ───

export interface CampaignProgressPayload {
  campaignId: string;
  orgId: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  readCount: number;
}
