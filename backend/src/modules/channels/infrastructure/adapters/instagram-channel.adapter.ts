import { Injectable, Logger } from '@nestjs/common';
import { ChannelType, MessageType } from '@prisma/client';
import { createHmac } from 'crypto';
import {
  ChannelAdapter,
  OutboundMessage,
  OutboundResult,
  InboundMessagePayload,
  StatusUpdatePayload,
  CredentialValidationResult,
  WebhookRegistrationResult,
  ChannelCapabilities,
} from '../../domain/interfaces/channel-adapter.interface';
import { CHANNEL_CONFIG } from '@/common/constants';

const META_API_BASE = 'https://graph.facebook.com/v19.0';

const INSTAGRAM_CAPABILITIES: ChannelCapabilities = {
  supportedMessageTypes: [MessageType.TEXT, MessageType.IMAGE, MessageType.VIDEO, MessageType.AUDIO],
  supportsReactions: true,
  supportsReadReceipts: false,
  supportsTypingIndicators: false,
  supportsMedia: true,
  maxTextLength: 1000,
  maxMediaSizeMb: 8,
  supportedMediaMimeTypes: ['image/jpeg', 'image/png', 'video/mp4'],
  supportsGroupChat: false,
  requiresContactOptIn: false,
};

@Injectable()
export class InstagramChannelAdapter implements ChannelAdapter {
  readonly channelType = ChannelType.INSTAGRAM;
  private readonly logger = new Logger(InstagramChannelAdapter.name);

  async sendMessage(message: OutboundMessage, config: Record<string, unknown>): Promise<OutboundResult> {
    const igUserId = config.igUserId as string;
    const accessToken = config.accessToken as string;
    const url = `${META_API_BASE}/${igUserId}/messages`;
    const payload = this.buildPayload(message);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(CHANNEL_CONFIG.PROVIDER_TIMEOUT_MS),
      });
      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data?.error?.message || `HTTP ${response.status}`;
        const errorCode = data?.error?.code;
        const retryable = errorCode !== 551 && errorCode !== 100;
        return { success: false, error: errorMessage, retryable };
      }

      return { success: true, externalMessageId: data?.message_id, providerResponse: data, retryable: false };
    } catch (error: any) {
      this.logger.error(`Instagram send failed: ${error.message}`, error.stack);
      return { success: false, error: error.message, retryable: true };
    }
  }

  private buildPayload(message: OutboundMessage): Record<string, unknown> {
    const base = { recipient: { id: message.recipientIdentifier } };
    switch (message.type) {
      case MessageType.TEXT:
        return { ...base, message: { text: message.body } };
      case MessageType.IMAGE:
        return { ...base, message: { attachment: { type: 'image', payload: { url: message.mediaUrl } } } };
      case MessageType.VIDEO:
        return { ...base, message: { attachment: { type: 'video', payload: { url: message.mediaUrl } } } };
      case MessageType.AUDIO:
        return { ...base, message: { attachment: { type: 'audio', payload: { url: message.mediaUrl } } } };
      default:
        return { ...base, message: { text: message.body || '' } };
    }
  }

  parseInboundEvent(rawEvent: Record<string, unknown>): InboundMessagePayload | null {
    const entry = (rawEvent as any)?.entry?.[0];
    const messaging = entry?.messaging?.[0];
    if (!messaging?.message || messaging.message.is_echo) return null;

    const msg = messaging.message;
    let type: MessageType = MessageType.TEXT;
    let mediaUrl: string | undefined;

    if (msg.attachments?.length > 0) {
      const attachment = msg.attachments[0];
      const typeMap: Record<string, MessageType> = { image: MessageType.IMAGE, video: MessageType.VIDEO, audio: MessageType.AUDIO };
      type = typeMap[attachment.type] || MessageType.TEXT;
      mediaUrl = attachment.payload?.url;
    }

    return {
      externalMessageId: msg.mid,
      senderIdentifier: messaging.sender.id,
      type,
      body: msg.text,
      mediaUrl,
      timestamp: new Date(messaging.timestamp),
      channelPayload: { igMessageId: msg.mid, storyUrl: msg.reply_to?.story?.url, reactionEmoji: msg.reaction?.emoji },
    };
  }

  parseStatusUpdate(rawEvent: Record<string, unknown>): StatusUpdatePayload | null {
    const entry = (rawEvent as any)?.entry?.[0];
    const messaging = entry?.messaging?.[0];
    if (messaging?.delivery?.mids?.length > 0) {
      return { externalMessageId: messaging.delivery.mids[0], status: 'DELIVERED' };
    }
    return null;
  }

  async validateCredentials(config: Record<string, unknown>): Promise<CredentialValidationResult> {
    const igUserId = config.igUserId as string;
    const accessToken = config.accessToken as string;

    try {
      const response = await fetch(
        `${META_API_BASE}/${igUserId}?fields=username,name,profile_picture_url`,
        { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10_000) },
      );
      const data = await response.json();
      if (!response.ok) {
        return { valid: false, externalId: '', externalHandle: '', capabilities: INSTAGRAM_CAPABILITIES, error: data?.error?.message };
      }
      return { valid: true, externalId: igUserId, externalHandle: `@${data.username}`, capabilities: INSTAGRAM_CAPABILITIES };
    } catch (error: any) {
      return { valid: false, externalId: '', externalHandle: '', capabilities: INSTAGRAM_CAPABILITIES, error: error.message };
    }
  }

  async registerWebhook(config: Record<string, unknown>, _callbackUrl: string): Promise<WebhookRegistrationResult> {
    const pageId = config.pageId as string;
    const accessToken = config.accessToken as string;
    await fetch(`${META_API_BASE}/${pageId}/subscribed_apps`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscribed_fields: ['messages', 'messaging_postbacks'] }),
      signal: AbortSignal.timeout(10_000),
    });
    return { webhookId: `ig-webhook-${pageId}` };
  }

  verifyWebhookSignature(payload: Buffer, signature: string, secret: string): boolean {
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    return `sha256=${expected}` === signature;
  }
}
