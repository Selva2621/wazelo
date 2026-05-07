import { ChannelType, MessageType } from '@prisma/client';

// ─────────────────────────────────────────────
// Channel Capabilities — what each provider supports
// ─────────────────────────────────────────────

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
  /** WhatsApp requires inbound message within 24h before outbound is allowed */
  requiresContactOptIn: boolean;
}

// ─────────────────────────────────────────────
// Outbound message — normalized shape sent to adapters
// ─────────────────────────────────────────────

export interface OutboundMessage {
  channelId: string;
  externalHandle: string;
  recipientIdentifier: string;
  type: MessageType;
  body?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  channelPayload?: Record<string, unknown>;
  idempotencyKey: string;
}

export interface OutboundResult {
  success: boolean;
  externalMessageId?: string;
  providerResponse?: Record<string, unknown>;
  error?: string;
  retryable: boolean;
}

// ─────────────────────────────────────────────
// Inbound message — normalized from provider webhooks
// ─────────────────────────────────────────────

export interface InboundMessagePayload {
  externalMessageId: string;
  senderIdentifier: string;
  senderName?: string;
  type: MessageType;
  body?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaSize?: number;
  channelPayload?: Record<string, unknown>;
  timestamp: Date;
}

// ─────────────────────────────────────────────
// Status update — delivery/read receipts from provider
// ─────────────────────────────────────────────

export interface StatusUpdatePayload {
  externalMessageId: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  error?: string;
}

// ─────────────────────────────────────────────
// Credential validation result
// ─────────────────────────────────────────────

export interface CredentialValidationResult {
  valid: boolean;
  externalId: string;
  externalHandle: string;
  capabilities: ChannelCapabilities;
  error?: string;
}

// ─────────────────────────────────────────────
// Webhook registration result
// ─────────────────────────────────────────────

export interface WebhookRegistrationResult {
  webhookId: string;
  webhookSecret?: string;
}

// ─────────────────────────────────────────────
// Channel Adapter — interface each provider must implement
// ─────────────────────────────────────────────

export interface ChannelAdapter {
  readonly channelType: ChannelType;

  /**
   * Send a message via this channel's provider API.
   * Must be idempotent (same idempotencyKey = same result).
   */
  sendMessage(
    message: OutboundMessage,
    decryptedConfig: Record<string, unknown>,
  ): Promise<OutboundResult>;

  /**
   * Parse a raw webhook/inbound event into a normalized InboundMessagePayload.
   * Returns null if the event is not a message (e.g., delivery receipt).
   */
  parseInboundEvent(
    rawEvent: Record<string, unknown>,
  ): InboundMessagePayload | null;

  /**
   * Parse a delivery/read status update from webhook.
   * Returns null if not a status event.
   */
  parseStatusUpdate(
    rawEvent: Record<string, unknown>,
  ): StatusUpdatePayload | null;

  /**
   * Validate credentials by making a lightweight API call.
   */
  validateCredentials(
    config: Record<string, unknown>,
  ): Promise<CredentialValidationResult>;

  /**
   * Register a webhook with the provider (if needed).
   */
  registerWebhook(
    config: Record<string, unknown>,
    callbackUrl: string,
  ): Promise<WebhookRegistrationResult>;

  /**
   * Verify an inbound webhook signature.
   */
  verifyWebhookSignature(
    payload: Buffer,
    signature: string,
    secret: string,
  ): boolean;
}
