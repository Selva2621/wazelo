import { createHmac, timingSafeEqual } from 'crypto';
import type { IncomingMessagePayload } from '../../application/use-cases/handle-incoming-message.use-case';
import type { StatusUpdatePayload } from '../../application/use-cases/handle-status-update.use-case';

export interface ParsedCloudWebhook {
  /** Meta phone number ID the events are about (one webhook can carry several numbers) */
  phoneNumberId: string;
  incoming: Omit<IncomingMessagePayload, 'sessionId'>[];
  statuses: StatusUpdatePayload[];
}

/** Meta signs the raw body with the app secret: `sha256=<hex>` */
export function verifyCloudSignature(rawBody: Buffer, signature: string | undefined, appSecret: string): boolean {
  if (!signature?.startsWith('sha256=')) return false;
  const expected = Buffer.from(`sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`);
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

const TYPE_MAP: Record<string, string> = {
  text: 'TEXT',
  image: 'IMAGE',
  video: 'VIDEO',
  audio: 'AUDIO',
  voice: 'AUDIO',
  document: 'DOCUMENT',
  sticker: 'STICKER',
  location: 'TEXT',
  button: 'TEXT',
  interactive: 'TEXT',
};

/** The text to show for a message: its body, a caption, or the button/list reply picked */
function bodyOf(msg: Record<string, any>): string | undefined {
  if (msg.text?.body) return msg.text.body;
  if (msg.button?.text) return msg.button.text;
  const reply = msg.interactive?.button_reply ?? msg.interactive?.list_reply;
  if (reply?.title) return reply.title;
  const media = msg.image ?? msg.video ?? msg.document;
  if (media?.caption) return media.caption;
  if (msg.document?.filename) return msg.document.filename;
  if (msg.location) {
    const place = [msg.location.name, msg.location.address].filter(Boolean).join(', ');
    return `📍 ${place || `${msg.location.latitude}, ${msg.location.longitude}`}`;
  }
  return undefined;
}

/**
 * Turn a WhatsApp Cloud API webhook into the same incoming-message and status
 * payloads the QR (Baileys) bridge produces, so one pipeline handles both.
 */
export function parseCloudWebhook(body: unknown): ParsedCloudWebhook[] {
  const out: ParsedCloudWebhook[] = [];
  const entries = (body as any)?.entry;
  if (!Array.isArray(entries)) return out;

  for (const entry of entries) {
    for (const change of entry?.changes ?? []) {
      if (change?.field !== 'messages') continue;
      const value = change.value ?? {};
      const phoneNumberId: string | undefined = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const names = new Map<string, string>();
      for (const c of value.contacts ?? []) {
        if (c?.wa_id && c?.profile?.name) names.set(c.wa_id, c.profile.name);
      }

      const incoming: ParsedCloudWebhook['incoming'] = [];
      for (const msg of value.messages ?? []) {
        const type = TYPE_MAP[msg?.type];
        if (!type || !msg.id || !msg.from) continue;
        const media = msg.image ?? msg.video ?? msg.audio ?? msg.voice ?? msg.document ?? msg.sticker;
        incoming.push({
          whatsappMessageId: msg.id,
          contactPhone: `+${msg.from}`,
          contactName: names.get(msg.from),
          type,
          body: bodyOf(msg),
          // Like QR numbers, received media isn't downloaded (yet)
          mediaUrl: undefined,
          mediaMimeType: media?.mime_type,
          mediaSize: undefined,
          timestamp: Number(msg.timestamp) || Math.floor(Date.now() / 1000),
          fromMe: false,
        });
      }

      const statuses: StatusUpdatePayload[] = [];
      for (const s of value.statuses ?? []) {
        if (!s?.id || !['sent', 'delivered', 'read', 'failed'].includes(s.status)) continue;
        const err = s.errors?.[0];
        statuses.push({
          whatsappMessageId: s.id,
          status: s.status,
          timestamp: Number(s.timestamp) || Math.floor(Date.now() / 1000),
          ...(err && { errorCode: err.code, errorMessage: err.error_data?.details || err.title || err.message }),
        });
      }

      if (incoming.length || statuses.length) out.push({ phoneNumberId, incoming, statuses });
    }
  }
  return out;
}
