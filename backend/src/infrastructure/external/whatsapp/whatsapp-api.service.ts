import { Injectable, Logger } from '@nestjs/common';
import { BaileysConnectionManager } from './baileys-connection-manager.service';
import { interactiveToText } from './interactive-to-text';
import { documentMimeType } from './document-mime';
import { CloudApiClient, type CloudCredentials, type CloudTemplateParams } from './cloud-api.client';
import {
  resolveTestRecipient,
  testRecipientOrThrow,
} from '@/common/utils/test-recipient-guard.util';

export interface WhatsAppSendResult {
  whatsappMessageId: string;
  timestamp: number;
}

@Injectable()
export class WhatsAppApiService {
  private readonly logger = new Logger(WhatsAppApiService.name);
  /** Official numbers that can send, by session ID (filled on boot and on connect) */
  private readonly cloudSessions = new Map<string, CloudCredentials>();

  constructor(
    private readonly connectionManager: BaileysConnectionManager,
    private readonly cloudApi: CloudApiClient,
  ) {}

  // ───── Official numbers ─────

  registerCloudSession(sessionId: string, creds: CloudCredentials): void {
    this.cloudSessions.set(sessionId, creds);
  }

  unregisterCloudSession(sessionId: string): void {
    this.cloudSessions.delete(sessionId);
  }

  /** True for an official (Cloud API) number: no socket, no warm-up, no typing */
  isCloudSession(sessionId: string): boolean {
    return this.cloudSessions.has(sessionId);
  }

  /** Send an approved template (official numbers only) */
  async sendTemplateMessage(
    sessionId: string,
    recipientPhone: string,
    template: CloudTemplateParams,
  ): Promise<WhatsAppSendResult> {
    recipientPhone = testRecipientOrThrow(recipientPhone);
    const creds = this.cloudSessions.get(sessionId);
    if (!creds) throw new Error('Templates can only be sent from an official WhatsApp number');
    return this.cloudResult(await this.cloudApi.sendTemplate(creds, recipientPhone, template));
  }

  async markCloudRead(sessionId: string, whatsappMessageId: string): Promise<void> {
    const creds = this.cloudSessions.get(sessionId);
    if (!creds) return;
    try {
      await this.cloudApi.markRead(creds, whatsappMessageId);
    } catch (error) {
      this.logger.debug(`Mark read failed for ${whatsappMessageId}: ${(error as Error).message}`);
    }
  }

  private cloudResult(whatsappMessageId: string): WhatsAppSendResult {
    return { whatsappMessageId, timestamp: Date.now() };
  }

  // ───── Sending (both kinds of number) ─────

  async sendTextMessage(
    sessionId: string,
    recipientPhone: string,
    text: string,
  ): Promise<WhatsAppSendResult> {
    recipientPhone = testRecipientOrThrow(recipientPhone);
    const cloud = this.cloudSessions.get(sessionId);
    if (cloud) return this.cloudResult(await this.cloudApi.sendText(cloud, recipientPhone, text));

    const sock = this.connectionManager.getConnection(sessionId);
    if (!sock) {
      throw new Error(`No active connection for session ${sessionId}`);
    }

    const jid = this.phoneToJid(recipientPhone);
    const result = await sock.sendMessage(jid, { text });

    return {
      whatsappMessageId: result?.key?.id || `local-${Date.now()}`,
      timestamp: Date.now(),
    };
  }

  async sendMediaMessage(
    sessionId: string,
    recipientPhone: string,
    type: string,
    mediaUrl: string,
    caption?: string,
  ): Promise<WhatsAppSendResult> {
    recipientPhone = testRecipientOrThrow(recipientPhone);
    const cloud = this.cloudSessions.get(sessionId);
    if (cloud) {
      const kind = type.toLowerCase();
      if (kind !== 'image' && kind !== 'video' && kind !== 'audio' && kind !== 'document') {
        throw new Error(`Unsupported media type: ${type}`);
      }
      return this.cloudResult(await this.cloudApi.sendMedia(cloud, recipientPhone, kind, mediaUrl, caption));
    }

    const sock = this.connectionManager.getConnection(sessionId);
    if (!sock) {
      throw new Error(`No active connection for session ${sessionId}`);
    }

    const jid = this.phoneToJid(recipientPhone);
    let content: Record<string, unknown>;

    switch (type.toUpperCase()) {
      case 'IMAGE':
        content = { image: { url: mediaUrl }, caption };
        break;
      case 'VIDEO':
        content = { video: { url: mediaUrl }, caption };
        break;
      case 'AUDIO':
        content = { audio: { url: mediaUrl }, mimetype: 'audio/mpeg' };
        break;
      case 'DOCUMENT':
        content = {
          document: { url: mediaUrl },
          // A real type lets WhatsApp show a preview (PDFs) instead of a generic file
          mimetype: documentMimeType(caption || mediaUrl),
          fileName: caption || 'document',
        };
        break;
      default:
        throw new Error(`Unsupported media type: ${type}`);
    }

    const result = await sock.sendMessage(jid, content as any);

    return {
      whatsappMessageId: result?.key?.id || `local-${Date.now()}`,
      timestamp: Date.now(),
    };
  }

  /**
   * Buttons and lists are not rendered for linked-device (Baileys) senders and
   * the odd payload can get a number flagged, so they go out as plain text
   * with numbered options instead.
   */
  async sendInteractiveMessage(
    sessionId: string,
    recipientPhone: string,
    interactivePayload: Record<string, unknown>,
  ): Promise<WhatsAppSendResult> {
    const interactiveType = interactivePayload.type as string;
    if (interactiveType !== 'button' && interactiveType !== 'list') {
      throw new Error(`Unsupported interactive type: ${interactiveType}`);
    }

    // Official numbers show real buttons and lists
    const cloud = this.cloudSessions.get(sessionId);
    if (cloud) {
      return this.cloudResult(
        await this.cloudApi.sendInteractive(cloud, testRecipientOrThrow(recipientPhone), interactivePayload),
      );
    }

    return this.sendTextMessage(
      sessionId,
      recipientPhone,
      interactiveToText(interactivePayload),
    );
  }

  /**
   * Send a single-choice WhatsApp poll. The caller provides the 32-byte
   * `messageSecret` and must keep it: votes can only be decrypted with it.
   */
  async sendPoll(
    sessionId: string,
    recipientPhone: string,
    poll: { name: string; options: string[]; messageSecret: Uint8Array },
  ): Promise<WhatsAppSendResult> {
    recipientPhone = testRecipientOrThrow(recipientPhone);
    if (this.cloudSessions.has(sessionId)) {
      throw new Error('Polls are not supported on official WhatsApp numbers');
    }
    const sock = this.connectionManager.getConnection(sessionId);
    if (!sock) {
      throw new Error(`No active connection for session ${sessionId}`);
    }

    const result = await sock.sendMessage(this.phoneToJid(recipientPhone), {
      poll: {
        name: poll.name,
        values: poll.options,
        selectableCount: 1,
        messageSecret: poll.messageSecret,
      },
    });

    return {
      whatsappMessageId: result?.key?.id || `local-${Date.now()}`,
      timestamp: Date.now(),
    };
  }

  /** Show "typing…" to the recipient for `durationMs`. Best effort — never blocks a send. */
  async showTyping(
    sessionId: string,
    recipientPhone: string,
    durationMs: number,
  ): Promise<void> {
    // Official numbers aren't human-paced: no fake typing
    if (this.cloudSessions.has(sessionId)) return;
    const sock = this.connectionManager.getConnection(sessionId);
    const to = resolveTestRecipient(recipientPhone);
    if (!sock || !to) return;

    const jid = this.phoneToJid(to);
    try {
      await sock.sendPresenceUpdate('composing', jid);
      await new Promise((resolve) => setTimeout(resolve, durationMs));
      await sock.sendPresenceUpdate('paused', jid);
    } catch (error) {
      this.logger.debug(`Typing indicator failed for session ${sessionId}: ${(error as Error).message}`);
    }
  }

  isSessionConnected(sessionId: string): boolean {
    return this.cloudSessions.has(sessionId) || this.connectionManager.isConnected(sessionId);
  }

  private phoneToJid(phone: string): string {
    const cleaned = phone.replace(/[^0-9]/g, '');
    return `${cleaned}@s.whatsapp.net`;
  }
}
