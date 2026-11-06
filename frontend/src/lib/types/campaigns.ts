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

/** How a campaign reaches contacts */
export type CampaignChannel = "WHATSAPP" | "EMAIL";

// ─── Audience Filters ───

export interface AudienceFilters {
  contactIds?: string[];
  contactGroupIds?: string[];
  leadStatuses?: string[];
  tagIds?: string[];
  ownerIds?: string[];
  sources?: string[];
}

// ─── Campaign ───

export interface Campaign {
  id: string;
  orgId: string;
  /** Null for email campaigns */
  sessionId: string | null;
  /** Older campaigns predate channels and are WhatsApp */
  channel?: CampaignChannel;
  emailSubject?: string | null;
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
  /** Counted from recipient records for display; avoids stale campaign counters. */
  processedRecipientCount?: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  readCount: number;
  /** Recipients who wrote back within a week of the campaign */
  repliedCount?: number;
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
  sessionId: string | null;
  session?: {
    id: string;
    phoneNumber: string | null;
  } | null;
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

/** GET /campaigns/:id/analytics (matches the backend response) */
export interface CampaignAnalytics {
  campaignId: string;
  name: string;
  status: CampaignStatus;
  startedAt: string | null;
  completedAt: string | null;
  timing: {
    elapsedMs: number;
    asOf: string;
  };
  /** Local hours WhatsApp campaign messages may go out (null for email) */
  sendWindow: { startHour: number; endHour: number; timeZone: string } | null;
  batches: CampaignBatchProgress[];
  metrics: {
    totalRecipients: number;
    sent: number;
    delivered: number;
    failed: number;
    read: number;
    skipped: number;
    pending: number;
    queued: number;
  };
  rates: { deliveryRate: number; failureRate: number; readRate: number };
  progress: { processed: number; remaining: number; percentComplete: number };
}

/**
 * done = nothing left; sending = this number's current batch;
 * waiting = queued behind an earlier batch on the same number;
 * blocked = has work but its number can't send (see `issue`);
 * paused = campaign paused; stopped = campaign ended with recipients left
 */
export type CampaignBatchState = "done" | "sending" | "waiting" | "blocked" | "paused" | "stopped";

export interface CampaignBatchProgress {
  batchNumber: number;
  sessionId: string | null;
  sessionPhoneNumber: string | null;
  sessionStatus: string | null;
  lastHeartbeatAt: string | null;
  sendingPausedUntil: string | null;
  sendingPausedReason: string | null;
  counts: RecipientStatusCounts;
  state: CampaignBatchState;
  issue: string | null;
  topFailures: { reason: string; count: number }[];
  issues: string[];
}

// ─── Audience Preview ───

export interface AudiencePreview {
  estimatedRecipients: number;
  /** WhatsApp: audience members a number check found aren't on WhatsApp (skipped) */
  notOnWhatsApp?: number;
  batchSize: number;
  maxRecipients: number;
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
  /** Legacy single sender; prefer sessionIds */
  sessionId?: string;
  /** WhatsApp numbers to send from, in order; batches are dealt round-robin across them at run time */
  sessionIds?: string[];
  /** WhatsApp only: send round the clock (daily per-number limits still apply) */
  sendAnyTime?: boolean;
  /** Optional per-batch overrides (1-based); batches without one follow the round-robin */
  batchAssignments?: { batchNumber: number; sessionId: string }[];
  channel?: CampaignChannel;
  emailSubject?: string;
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
