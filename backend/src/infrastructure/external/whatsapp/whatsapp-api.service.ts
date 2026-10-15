import { Injectable, Logger } from '@nestjs/common';
import { BaileysConnectionManager } from './baileys-connection-manager.service';
import { interactiveToText } from './interactive-to-text';

export interface WhatsAppSendResult {
  whatsappMessageId: string;
  timestamp: number;
}

@Injectable()
export class WhatsAppApiService {
  private readonly logger = new Logger(WhatsAppApiService.name);

  constructor(
    private readonly connectionManager: BaileysConnectionManager,
  ) {}

  async sendTextMessage(
    sessionId: string,
    recipientPhone: string,
    text: string,
  ): Promise<WhatsAppSendResult> {
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
          mimetype: 'application/octet-stream',
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
    const sock = this.connectionManager.getConnection(sessionId);
    if (!sock) return;

    const jid = this.phoneToJid(recipientPhone);
    try {
      await sock.sendPresenceUpdate('composing', jid);
      await new Promise((resolve) => setTimeout(resolve, durationMs));
      await sock.sendPresenceUpdate('paused', jid);
    } catch (error) {
      this.logger.debug(`Typing indicator failed for session ${sessionId}: ${(error as Error).message}`);
    }
  }

  isSessionConnected(sessionId: string): boolean {
    return this.connectionManager.isConnected(sessionId);
  }

  private phoneToJid(phone: string): string {
    const cleaned = phone.replace(/[^0-9]/g, '');
    return `${cleaned}@s.whatsapp.net`;
  }
}
