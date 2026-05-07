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

const FACEBOOK_CAPABILITIES: ChannelCapabilities = {
  supportedMessageTypes: [MessageType.TEXT, MessageType.IMAGE, MessageType.VIDEO, MessageType.AUDIO, MessageType.DOCUMENT],
  supportsReactions: true,
  supportsReadReceipts: true,
  supportsTypingIndicators: true,
  supportsMedia: true,
  maxTextLength: 2000,
  maxMediaSizeMb: 25,
  supportedMediaMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg', 'application/pdf'],
  supportsGroupChat: false,
  requiresContactOptIn: false,
};

@Injectable()
export class FacebookChannelAdapter implements ChannelAdapter {
  readonly channelType = ChannelType.FACEBOOK_MESSENGER;
  private readonly logger = new Logger(FacebookChannelAdapter.name);

  async sendMessage(message: OutboundMessage, config: Record<string, unknown>): Promise<OutboundResult> {
    const accessToken = config.accessToken as string;
    const url = `${META_API_BASE}/me/messages`;
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
        const retryable = errorCode !== 551 && errorCode !== 200 && errorCode !== 100;
        return { success: false, error: errorMessage, retryable };
      }

      return { success: true, externalMessageId: data?.message_id, providerResponse: data, retryable: false };
    } catch (error: any) {
      this.logger.error(`Facebook Messenger send failed: ${error.message}`, error.stack);
      return { success: false, error: error.message, retryable: true };
    }
  }

  private buildPayload(message: OutboundMessage): Record<string, unknown> {
    const base = { recipient: { id: message.recipientIdentifier } };
    switch (message.type) {
      case MessageType.TEXT:
        return { ...base, message: { text: message.body } };
      case MessageType.IMAGE:
        return { ...base, message: { attachment: { type: 'image', payload: { url: message.mediaUrl, is_reusable: true } } } };
      case MessageType.VIDEO:
        return { ...base, message: { attachment: { type: 'video', payload: { url: message.mediaUrl, is_reusable: true } } } };
      case MessageType.AUDIO:
        return { ...base, message: { attachment: { type: 'audio', payload: { url: message.mediaUrl, is_reusable: true } } } };
      case MessageType.DOCUMENT:
        return { ...base, message: { attachment: { type: 'file', payload: { url: message.mediaUrl, is_reusable: true } } } };
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
      const typeMap: Record<string, MessageType> = { image: MessageType.IMAGE, video: MessageType.VIDEO, audio: MessageType.AUDIO, file: MessageType.DOCUMENT };
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
      channelPayload: { fbMessageId: msg.mid, quickReply: msg.quick_reply?.payload },
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
    const pageId = config.pageId as string;
    const accessToken = config.accessToken as string;

    try {
      const response = await fetch(
        `${META_API_BASE}/${pageId}?fields=name,id`,
        { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10_000) },
      );
      const data = await response.json();
      if (!response.ok) {
        return { valid: false, externalId: '', externalHandle: '', capabilities: FACEBOOK_CAPABILITIES, error: data?.error?.message };
      }
      return { valid: true, externalId: pageId, externalHandle: data.name, capabilities: FACEBOOK_CAPABILITIES };
    } catch (error: any) {
      return { valid: false, externalId: '', externalHandle: '', capabilities: FACEBOOK_CAPABILITIES, error: error.message };
    }
  }

  async registerWebhook(config: Record<string, unknown>, _callbackUrl: string): Promise<WebhookRegistrationResult> {
    const pageId = config.pageId as string;
    const accessToken = config.accessToken as string;
    await fetch(`${META_API_BASE}/${pageId}/subscribed_apps`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscribed_fields: ['messages', 'messaging_postbacks', 'message_deliveries', 'message_reads'] }),
      signal: AbortSignal.timeout(10_000),
    });
    return { webhookId: `fb-webhook-${pageId}` };
  }

  verifyWebhookSignature(payload: Buffer, signature: string, secret: string): boolean {
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    return `sha256=${expected}` === signature;
  }
}
