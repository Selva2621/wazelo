import { Injectable } from '@nestjs/common';

/** Graph API version for every WhatsApp Cloud API call */
export const CLOUD_API_BASE = 'https://graph.facebook.com/v21.0';
const TIMEOUT_MS = 15_000;

export interface CloudCredentials {
  phoneNumberId: string;
  accessToken: string;
}

export interface CloudPhoneInfo {
  displayPhoneNumber: string;
  verifiedName: string | null;
  qualityRating: string | null;
  messagingTier: string | null;
}

export interface CloudTemplateParams {
  name: string;
  language: string;
  /** Body {{1}}, {{2}}… values, in order */
  bodyParams?: string[];
  /** Header media (image / video / document template headers) */
  headerMedia?: { type: 'image' | 'video' | 'document'; link: string };
}

/** A Meta API error, with the code that tells a 24-hour-window or token problem apart */
export class CloudApiError extends Error {
  constructor(
    message: string,
    readonly code: number | null,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

/** Meta throttling codes: worth retrying after a pause */
const THROTTLE_CODES = new Set([4, 80007, 130429, 131048, 131056]);

/** Plain words for the errors people will actually hit */
function friendlyMessage(code: number | null, raw: string): string {
  switch (code) {
    case 131047:
      return 'More than 24 hours since the customer last messaged: only an approved template can be sent';
    case 131026:
      return "Number not on WhatsApp or can't receive this message";
    case 131021:
      return "Can't send to your own number";
    case 131031:
      return 'Meta has locked this WhatsApp Business Account. Check WhatsApp Manager → Account quality and request a review';
    case 131030:
      return "Recipient isn't in this test number's allowed list (Meta API Setup → To)";
    case 132000:
    case 132001:
      return 'Template not found or not approved for this language';
    case 131056:
      return 'Too many messages to this person too quickly. Try again shortly';
    case 130429:
    case 131048:
      return 'Meta rate limit reached for this number. Try again shortly';
    case 190:
      return 'Access token is invalid or expired. Use a permanent System user token';
    case 10:
    case 200:
      return 'Access token lacks permission for this number (whatsapp_business_messaging)';
    default:
      return raw;
  }
}

/**
 * Thin HTTP client for the WhatsApp Cloud API (official Meta numbers).
 * No business rules: callers decide what to send and when.
 */
@Injectable()
export class CloudApiClient {
  async getPhoneInfo(creds: CloudCredentials): Promise<CloudPhoneInfo> {
    const data = await this.request<Record<string, unknown>>(
      'GET',
      `${creds.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier`,
      creds.accessToken,
    );
    return {
      displayPhoneNumber: String(data.display_phone_number ?? ''),
      verifiedName: (data.verified_name as string) ?? null,
      qualityRating: (data.quality_rating as string) ?? null,
      messagingTier: (data.messaging_limit_tier as string) ?? null,
    };
  }

  /** Every message template in the business account (all statuses), following Meta's paging */
  async listTemplates(wabaId: string, accessToken: string): Promise<Array<Record<string, any>>> {
    const all: Array<Record<string, any>> = [];
    let path: string | null = `${wabaId}/message_templates?fields=id,name,language,status,category,components&limit=100`;
    for (let page = 0; path && page < 20; page++) {
      const data: { data?: Array<Record<string, any>>; paging?: { next?: string; cursors?: { after?: string } } } =
        await this.request('GET', path, accessToken);
      all.push(...(data.data ?? []));
      const after = data.paging?.next ? data.paging.cursors?.after : undefined;
      path = after
        ? `${wabaId}/message_templates?fields=id,name,language,status,category,components&limit=100&after=${encodeURIComponent(after)}`
        : null;
    }
    return all;
  }

  /** Subscribe our app to the WABA so its messages and statuses reach our webhook */
  async subscribeApp(wabaId: string, accessToken: string): Promise<void> {
    await this.request('POST', `${wabaId}/subscribed_apps`, accessToken);
  }

  async sendText(creds: CloudCredentials, to: string, body: string): Promise<string> {
    return this.send(creds, to, { type: 'text', text: { preview_url: true, body } });
  }

  async sendMedia(
    creds: CloudCredentials,
    to: string,
    type: 'image' | 'video' | 'audio' | 'document',
    link: string,
    caption?: string,
    filename?: string,
  ): Promise<string> {
    const media: Record<string, unknown> = { link };
    if (caption && type !== 'audio') media.caption = caption;
    if (type === 'document') media.filename = filename || caption || 'document';
    return this.send(creds, to, { type, [type]: media });
  }

  /** Native buttons / list (rendered properly on official numbers) */
  async sendInteractive(creds: CloudCredentials, to: string, interactive: Record<string, unknown>): Promise<string> {
    return this.send(creds, to, { type: 'interactive', interactive });
  }

  async sendTemplate(creds: CloudCredentials, to: string, tpl: CloudTemplateParams): Promise<string> {
    const components: unknown[] = [];
    if (tpl.headerMedia) {
      components.push({
        type: 'header',
        parameters: [{ type: tpl.headerMedia.type, [tpl.headerMedia.type]: { link: tpl.headerMedia.link } }],
      });
    }
    if (tpl.bodyParams?.length) {
      components.push({ type: 'body', parameters: tpl.bodyParams.map((text) => ({ type: 'text', text })) });
    }
    return this.send(creds, to, {
      type: 'template',
      template: {
        name: tpl.name,
        language: { code: tpl.language || 'en' },
        ...(components.length > 0 && { components }),
      },
    });
  }

  /** Blue ticks for a message the customer sent */
  async markRead(creds: CloudCredentials, messageId: string): Promise<void> {
    await this.request('POST', `${creds.phoneNumberId}/messages`, creds.accessToken, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });
  }

  /** A temporary download URL for media a customer sent (fetching it needs the token too) */
  async getMediaUrl(mediaId: string, accessToken: string): Promise<{ url: string; mimeType: string | null }> {
    const data = await this.request<Record<string, unknown>>('GET', mediaId, accessToken);
    return { url: String(data.url ?? ''), mimeType: (data.mime_type as string) ?? null };
  }

  private async send(creds: CloudCredentials, to: string, message: Record<string, unknown>): Promise<string> {
    const data = await this.request<{ messages?: Array<{ id: string }> }>(
      'POST',
      `${creds.phoneNumberId}/messages`,
      creds.accessToken,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/[^0-9]/g, ''),
        ...message,
      },
    );
    const id = data.messages?.[0]?.id;
    if (!id) throw new CloudApiError('Meta returned no message ID', null, true);
    return id;
  }

  private async request<T = unknown>(
    method: 'GET' | 'POST',
    path: string,
    accessToken: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${CLOUD_API_BASE}/${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(body && { 'Content-Type': 'application/json' }),
        },
        ...(body && { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      throw new CloudApiError(`Couldn't reach Meta: ${(err as Error).message}`, null, true);
    }

    const data = (await response.json().catch(() => ({}))) as Record<string, any>;
    if (!response.ok) {
      const code: number | null = data?.error?.code ?? null;
      const raw: string = data?.error?.error_data?.details || data?.error?.message || `HTTP ${response.status}`;
      const retryable = response.status >= 500 || response.status === 429 || (code !== null && THROTTLE_CODES.has(code));
      throw new CloudApiError(friendlyMessage(code, raw), code, retryable);
    }
    return data as T;
  }
}
