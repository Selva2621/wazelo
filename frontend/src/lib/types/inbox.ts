// ─── Backend-aligned types (EPIC 5 Messaging Engine) ─────

import type { ChannelType } from "./channels";

// ─── Interactive message types (buttons & lists) ─────

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface InteractiveListRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveListSection {
  title?: string;
  rows: InteractiveListRow[];
}

export interface InteractivePayload {
  type: "button" | "list";
  header?: string;
  body: string;
  footer?: string;
  buttons?: InteractiveButton[];
  sections?: InteractiveListSection[];
  buttonText?: string;
}

// Matches backend Conversation model
export interface ConversationResponse {
  id: string;
  orgId: string;
  sessionId: string;
  contactId: string | null;
  contactPhone: string;
  status: "OPEN" | "CLOSED" | "ARCHIVED";
  lastMessageAt: string | null;
  lastMessageBody: string | null;
  unreadCount: number;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined field from backend (if populated)
  contactName?: string;
  // EPIC 16 — Multi-Channel fields
  channelId?: string | null;
  channelType?: ChannelType | null;
  contactIdentifier?: string | null;
}

export interface ConversationListResponse {
  data: ConversationResponse[];
  total: number;
  page: number;
  limit: number;
}

// Matches backend Message model
export type MessageDirection = "INBOUND" | "OUTBOUND";
export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO" | "INTERACTIVE";
export type MessageStatus =
  | "QUEUED"
  | "PROCESSING"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED";

export interface MessageResponse {
  id: string;
  orgId: string;
  sessionId: string;
  conversationId: string | null;
  direction: MessageDirection;
  type: MessageType;
  contactPhone: string;
  contactName: string | null;
  body: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  status: MessageStatus;
  whatsappMessageId: string | null;
  interactivePayload?: InteractivePayload | null;
  idempotencyKey: string | null;
  retryCount: number;
  failedReason: string | null;
  createdAt: string;
  // EPIC 16 — Multi-Channel fields
  channelId?: string | null;
  channelType?: ChannelType | null;
  externalMessageId?: string | null;
  channelPayload?: Record<string, unknown> | null;
}

export interface MessagesListResponse {
  data: MessageResponse[];
  total: number;
  page: number;
  limit: number;
}

// Matches backend MessageEvent model
export interface MessageEventResponse {
  id: string;
  messageId: string;
  status: MessageStatus;
  error: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// Matches backend SendMessageDto
export interface SendMessageRequest {
  contactPhone: string;
  contactName?: string;
  type?: MessageType;
  body?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  idempotencyKey?: string;
  priority?: number;
  viaSessionUserId?: string;
  conversationId?: string;
  /** Interactive message payload (buttons or list). Required when type=INTERACTIVE. */
  interactive?: InteractivePayload;
  // EPIC 16 — Multi-Channel fields
  channelId?: string;
  contactIdentifier?: string;
  channelPayload?: Record<string, unknown>;
}

// Query params matching backend DTOs
export interface ListConversationsParams {
  status?: "OPEN" | "CLOSED" | "ARCHIVED";
  assignedToId?: string;
  sessionId?: string;
  targetUserId?: string;
  teamView?: boolean;
  page?: number;
  limit?: number;
  // EPIC 16 — Multi-Channel filter
  channelType?: ChannelType;
  /** Filter by contact phone — used to open a specific contact's conversation */
  contactPhone?: string;
}

export interface ListMessagesParams {
  conversationId?: string;
  sessionId?: string;
  contactPhone?: string;
  page?: number;
  limit?: number;
  before?: string;
}

// Contact detail (used by contact panel — unchanged)
export interface ContactDetailResponse {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string | null;
  leadStatus: string;
  tags: string[];
  notes: string;
  assignedTo?: string;
}

// ─── WebSocket event payloads ─────

export interface WsMessageReceivedPayload {
  messageId: string;
  sessionId: string;
  contactPhone: string;
  type: MessageType;
}

export interface WsMessageQueuedPayload {
  messageId: string;
  conversationId: string;
  sessionId: string;
  contactPhone: string;
  type: MessageType;
}

export interface WsMessageStatusPayload {
  messageId: string;
  status: "PROCESSING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  reason?: string;
  retryCount?: number;
}

export interface WsConversationUpdatedPayload {
  conversationId: string;
  lastMessageAt: string;
  lastMessageBody: string;
  unreadCount: number;
}

export interface WsRateLimitPayload {
  sessionId: string;
  limitType: string;
  currentCount: number;
  maxAllowed: number;
}
