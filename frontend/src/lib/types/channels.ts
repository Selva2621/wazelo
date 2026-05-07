import type { MessageType } from "./inbox";

// ─── Backend-aligned enums (EPIC 16 Multi-Channel) ─────

export type ChannelType =
  | "WHATSAPP"
  | "INSTAGRAM"
  | "FACEBOOK_MESSENGER"
  | "EMAIL";

export type ChannelStatus =
  | "PENDING_SETUP"
  | "VERIFYING"
  | "ACTIVE"
  | "SUSPENDED"
  | "ERROR"
  | "DISCONNECTED";

// ─── Channel capabilities (from adapter interface) ─────

export interface ChannelCapabilities {
  supportedMessageTypes: MessageType[];
  supportsReactions: boolean;
  supportsReadReceipts: boolean;
  supportsTypingIndicators: boolean;
  supportsMedia: boolean;
  maxTextLength: number;
  maxMediaSizeMb: number;
  supportedMediaMimeTypes: string[];
  supportsGroupChat: boolean;
  requiresContactOptIn: boolean;
}

// ─── Channel model (matches backend controller response) ─────

export interface Channel {
  id: string;
  orgId: string;
  type: ChannelType;
  name: string;
  status: ChannelStatus;
  externalId: string | null;
  externalHandle: string | null;
  capabilities: ChannelCapabilities;
  rateLimitPerMin: number;
  rateLimitBurst: number;
  verifiedAt: string | null;
  suspendedAt: string | null;
  suspendReason: string | null;
  lastActiveAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Request DTOs ─────

export interface CreateChannelRequest {
  type: ChannelType;
  name: string;
  config: Record<string, unknown>;
  rateLimitPerMin?: number;
}

export interface UpdateChannelRequest {
  name?: string;
  rateLimitPerMin?: number;
  config?: Record<string, unknown>;
}

export interface SuspendChannelRequest {
  reason: string;
}

export interface ListChannelsParams {
  type?: ChannelType;
  status?: ChannelStatus;
}

// ─── WebSocket event payloads ─────

export interface WsChannelCreatedPayload {
  channelId: string;
  channelType: ChannelType;
}

export interface WsChannelSuspendedPayload {
  channelId: string;
  channelType: ChannelType;
  reason: string;
}

export interface WsChannelDeletedPayload {
  channelId: string;
  channelType: ChannelType;
}

export interface WsChannelMessagePayload {
  messageId: string;
  channelId: string;
  channelType: ChannelType;
  conversationId: string;
  externalMessageId?: string;
  senderIdentifier?: string;
  senderName?: string;
  error?: string;
}

// ─── Display labels ─────

export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK_MESSENGER: "Facebook Messenger",
  EMAIL: "Email",
};

export const CHANNEL_STATUS_LABELS: Record<ChannelStatus, string> = {
  PENDING_SETUP: "Pending Setup",
  VERIFYING: "Verifying",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  ERROR: "Error",
  DISCONNECTED: "Disconnected",
};

// ─── Per-channel config field definitions ─────

export interface ChannelConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "number";
  required: boolean;
  placeholder: string;
}

export const CHANNEL_CONFIG_FIELDS: Record<ChannelType, ChannelConfigField[]> = {
  WHATSAPP: [
    { key: "phoneNumberId", label: "Phone Number ID", type: "text", required: true, placeholder: "e.g. 123456789012345" },
    { key: "accessToken", label: "Access Token", type: "password", required: true, placeholder: "Meta API access token" },
    { key: "businessAccountId", label: "Business Account ID", type: "text", required: true, placeholder: "e.g. 987654321098765" },
    { key: "webhookVerifyToken", label: "Webhook Verify Token", type: "text", required: false, placeholder: "Optional custom verify token" },
  ],
  INSTAGRAM: [
    { key: "pageId", label: "Facebook Page ID", type: "text", required: true, placeholder: "Connected Facebook Page ID" },
    { key: "accessToken", label: "Access Token", type: "password", required: true, placeholder: "Meta API access token" },
    { key: "igUserId", label: "Instagram User ID", type: "text", required: true, placeholder: "Instagram business account ID" },
  ],
  FACEBOOK_MESSENGER: [
    { key: "pageId", label: "Facebook Page ID", type: "text", required: true, placeholder: "Facebook Page ID" },
    { key: "accessToken", label: "Page Access Token", type: "password", required: true, placeholder: "Meta API page access token" },
  ],
  EMAIL: [
    { key: "smtpHost", label: "SMTP Host", type: "text", required: true, placeholder: "e.g. smtp.gmail.com" },
    { key: "smtpPort", label: "SMTP Port", type: "number", required: true, placeholder: "465" },
    { key: "smtpUser", label: "SMTP Username", type: "text", required: true, placeholder: "email@example.com" },
    { key: "smtpPass", label: "SMTP Password", type: "password", required: true, placeholder: "App password or SMTP password" },
    { key: "fromAddress", label: "From Address", type: "text", required: true, placeholder: "support@yourcompany.com" },
    { key: "fromName", label: "From Name", type: "text", required: false, placeholder: "Your Company Support" },
    { key: "imapHost", label: "IMAP Host", type: "text", required: false, placeholder: "e.g. imap.gmail.com" },
    { key: "imapPort", label: "IMAP Port", type: "number", required: false, placeholder: "993" },
    { key: "imapUser", label: "IMAP Username", type: "text", required: false, placeholder: "Same as SMTP user" },
    { key: "imapPass", label: "IMAP Password", type: "password", required: false, placeholder: "Same as SMTP password" },
  ],
};
