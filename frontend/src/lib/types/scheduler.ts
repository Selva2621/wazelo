// ─── Enums (match backend Prisma enums) ───

export type ScheduledMessageStatus =
  | "PENDING"
  | "QUEUED"
  | "SENT"
  | "CANCELLED"
  | "FAILED";

export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO";

// ─── Scheduled Message ───

export interface ScheduledMessage {
  id: string;
  orgId: string;
  sessionId: string;
  contactPhone: string;
  messageType: MessageType;
  messageBody: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  status: ScheduledMessageStatus;
  scheduledAt: string;
  timezone: string;
  sentMessageId: string | null;
  failedReason: string | null;
  retryCount: number;
  maxRetries: number;
  pgBossJobId: string | null;
  idempotencyKey: string | null;
  createdById: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ─── List Response ───

export interface ScheduledMessageListResponse {
  data: ScheduledMessage[];
  total: number;
}

// ─── Request DTOs ───

export interface CreateScheduledMessageRequest {
  sessionId: string;
  contactPhone: string;
  messageType: MessageType;
  messageBody?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  scheduledAt: string;
  timezone?: string;
  metadata?: Record<string, unknown>;
  productId?: string;
}

export interface UpdateScheduledMessageRequest {
  messageType?: MessageType;
  messageBody?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  scheduledAt?: string;
  timezone?: string;
  metadata?: Record<string, unknown>;
}

// ─── Query Params ───

export interface ListScheduledMessagesParams {
  status?: ScheduledMessageStatus;
  limit?: number;
  offset?: number;
}
