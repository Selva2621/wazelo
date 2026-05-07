import { Injectable, Logger } from '@nestjs/common';
import { ChannelType, MessageType } from '@prisma/client';
import { createHmac, randomUUID } from 'crypto';
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

const NON_RETRYABLE_ERRORS = [
  'invalid_phone_number',
  'recipient_not_found',
  'media_too_large',
  'unsupported_message_type',
  'account_suspended',
  'blocked',
  'banned',
];

const WHATSAPP_CAPABILITIES: ChannelCapabilities = {
  supportedMessageTypes: [
    MessageType.TEXT,
    MessageType.IMAGE,
    MessageType.VIDEO,
    MessageType.DOCUMENT,
    MessageType.AUDIO,
    MessageType.STICKER,
    MessageType.LOCATION,
    MessageType.CONTACT,
  ],
  supportsReactions: true,
  supportsReadReceipts: true,
  supportsTypingIndicators: false,
  supportsMedia: true,
  maxTextLength: 4096,
  maxMediaSizeMb: 16,
  supportedMediaMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'audio/ogg',
    'audio/mpeg',
    'application/pdf',
  ],
  supportsGroupChat: false,
  requiresContactOptIn: true,
};

@Injectable()
export class WhatsAppChannelAdapter implements ChannelAdapter {
  readonly channelType = ChannelType.WHATSAPP;
  private readonly logger = new Logger(WhatsAppChannelAdapter.name);

  async sendMessage(
    message: OutboundMessage,
    config: Record<string, unknown>,
  ): Promise<OutboundResult> {
    const phoneNumberId = config.phoneNumberId as string;
    const accessToken = config.accessToken as string;
    const url = `${META_API_BASE}/${phoneNumberId}/messages`;
    const payload = this.buildOutboundPayload(message);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(CHANNEL_CONFIG.PROVIDER_TIMEOUT_MS),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data?.error?.message || `HTTP ${response.status}`;
        const retryable = !NON_RETRYABLE_ERRORS.some((e) =>
          errorMessage.toLowerCase().includes(e),
        );
        return { success: false, error: errorMessage, retryable, providerResponse: data };
      }

      const externalMessageId = data?.messages?.[0]?.id;
      if (!externalMessageId) {
        return { success: false, error: 'No message ID in response', retryable: true };
      }

      return { success: true, externalMessageId, providerResponse: data, retryable: false };
    } catch (error: any) {
      this.logger.error(`WhatsApp send failed: ${error.message}`, error.stack);
      return { success: false, error: error.message, retryable: true };
    }
  }

  private buildOutboundPayload(message: OutboundMessage): Record<string, unknown> {
    const base = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: message.recipientIdentifier,
    };

    // Template message (WhatsApp Business API pre-approved templates)
    if (message.channelPayload?.templateName) {
      const templateComponents: unknown[] = [];
      const variables = message.channelPayload.variables as Record<string, string> | undefined;

      if (variables && Object.keys(variables).length > 0) {
        templateComponents.push({
          type: 'body',
          parameters: Object.values(variables).map((v) => ({
            type: 'text',
            text: v,
          })),
        });
      }

      return {
        ...base,
        type: 'template',
        template: {
          name: message.channelPayload.templateName,
          language: { code: message.channelPayload.templateLanguage || 'en' },
          ...(templateComponents.length > 0 && { components: templateComponents }),
        },
      };
    }

    switch (message.type) {
      case MessageType.TEXT:
        return { ...base, type: 'text', text: { preview_url: true, body: message.body } };
      case MessageType.IMAGE:
        return { ...base, type: 'image', image: { link: message.mediaUrl, caption: message.body } };
      case MessageType.VIDEO:
        return { ...base, type: 'video', video: { link: message.mediaUrl, caption: message.body } };
      case MessageType.DOCUMENT:
        return { ...base, type: 'document', document: { link: message.mediaUrl, caption: message.body, filename: message.channelPayload?.filename } };
      case MessageType.AUDIO:
        return { ...base, type: 'audio', audio: { link: message.mediaUrl } };
      case MessageType.LOCATION:
        return { ...base, type: 'location', location: { latitude: message.channelPayload?.latitude, longitude: message.channelPayload?.longitude, name: message.channelPayload?.locationName } };
      case MessageType.STICKER:
        return { ...base, type: 'sticker', sticker: { link: message.mediaUrl } };
      default:
        return { ...base, type: 'text', text: { body: message.body } };
    }
  }

  parseInboundEvent(rawEvent: Record<string, unknown>): InboundMessagePayload | null {
    const entry = (rawEvent as any)?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];
    if (!message) return null;

    const contact = value?.contacts?.[0];
    const timestamp = new Date(parseInt(message.timestamp, 10) * 1000);

    const payload: InboundMessagePayload = {
      externalMessageId: message.id,
      senderIdentifier: message.from,
      senderName: contact?.profile?.name,
      type: this.mapWhatsAppType(message.type),
      body: message.text?.body || message.caption || undefined,
      timestamp,
      channelPayload: { waMessageId: message.id, contextMessageId: message.context?.id },
    };

    const mediaObj = message.image || message.video || message.document || message.audio || message.sticker;
    if (mediaObj) {
      payload.mediaUrl = mediaObj.id;
      payload.mediaMimeType = mediaObj.mime_type;
      payload.mediaSize = mediaObj.file_size;
    }

    if (message.type === 'location') {
      payload.channelPayload = {
        ...payload.channelPayload,
        latitude: message.location.latitude,
        longitude: message.location.longitude,
        locationName: message.location.name,
      };
    }

    return payload;
  }

  parseStatusUpdate(rawEvent: Record<string, unknown>): StatusUpdatePayload | null {
    const entry = (rawEvent as any)?.entry?.[0];
    const change = entry?.changes?.[0];
    const status = change?.value?.statuses?.[0];
    if (!status) return null;

    const statusMap: Record<string, 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'> = {
      sent: 'SENT', delivered: 'DELIVERED', read: 'READ', failed: 'FAILED',
    };
    const mapped = statusMap[status.status];
    if (!mapped) return null;

    return { externalMessageId: status.id, status: mapped, error: status.errors?.[0]?.message };
  }

  async validateCredentials(config: Record<string, unknown>): Promise<CredentialValidationResult> {
    const phoneNumberId = config.phoneNumberId as string;
    const accessToken = config.accessToken as string;

    try {
      const response = await fetch(
        `${META_API_BASE}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(10_000),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        return { valid: false, externalId: '', externalHandle: '', capabilities: WHATSAPP_CAPABILITIES, error: data?.error?.message || `HTTP ${response.status}` };
      }

      return { valid: true, externalId: phoneNumberId, externalHandle: data.display_phone_number, capabilities: WHATSAPP_CAPABILITIES };
    } catch (error: any) {
      return { valid: false, externalId: '', externalHandle: '', capabilities: WHATSAPP_CAPABILITIES, error: error.message };
    }
  }

  async registerWebhook(config: Record<string, unknown>, _callbackUrl: string): Promise<WebhookRegistrationResult> {
    const accessToken = config.accessToken as string;
    const businessAccountId = config.businessAccountId as string;
    const verifyToken = (config.webhookVerifyToken as string) || randomUUID();

    await fetch(`${META_API_BASE}/${businessAccountId}/subscribed_apps`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });

    return { webhookId: `wa-webhook-${businessAccountId}`, webhookSecret: verifyToken };
  }

  verifyWebhookSignature(payload: Buffer, signature: string, secret: string): boolean {
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    return `sha256=${expected}` === signature;
  }

  private mapWhatsAppType(waType: string): MessageType {
    const mapping: Record<string, MessageType> = {
      text: MessageType.TEXT, image: MessageType.IMAGE, video: MessageType.VIDEO,
      document: MessageType.DOCUMENT, audio: MessageType.AUDIO, sticker: MessageType.STICKER,
      location: MessageType.LOCATION, contacts: MessageType.CONTACT,
    };
    return mapping[waType] || MessageType.TEXT;
  }
}
