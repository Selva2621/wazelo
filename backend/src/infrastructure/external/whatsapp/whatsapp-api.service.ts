import { Injectable, Logger } from '@nestjs/common';
import { BaileysConnectionManager } from './baileys-connection-manager.service';

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

  async sendInteractiveMessage(
    sessionId: string,
    recipientPhone: string,
    interactivePayload: Record<string, unknown>,
  ): Promise<WhatsAppSendResult> {
    const sock = this.connectionManager.getConnection(sessionId);
    if (!sock) {
      throw new Error(`No active connection for session ${sessionId}`);
    }

    const jid = this.phoneToJid(recipientPhone);
    const interactiveType = interactivePayload.type as string;
    let content: Record<string, unknown>;

    if (interactiveType === 'button') {
      // WhatsApp button message (up to 3 buttons)
      const buttons = (interactivePayload.buttons as Array<{ id: string; title: string }>).map(
        (btn, i) => ({
          buttonId: btn.id || `btn-${i}`,
          buttonText: { displayText: btn.title },
          type: 1,
        }),
      );
      content = {
        text: interactivePayload.body as string,
        footer: interactivePayload.footer as string | undefined,
        buttons,
        headerType: 1,
      };
    } else if (interactiveType === 'list') {
      // WhatsApp list message (sections with rows)
      content = {
        text: interactivePayload.body as string,
        footer: interactivePayload.footer as string | undefined,
        title: interactivePayload.header as string | undefined,
        buttonText: interactivePayload.buttonText as string || 'Choose',
        sections: interactivePayload.sections as Array<unknown>,
      };
    } else {
      throw new Error(`Unsupported interactive type: ${interactiveType}`);
    }

    const result = await sock.sendMessage(jid, content as any);

    return {
      whatsappMessageId: result?.key?.id || `local-${Date.now()}`,
      timestamp: Date.now(),
    };
  }

  isSessionConnected(sessionId: string): boolean {
    return this.connectionManager.isConnected(sessionId);
  }

  private phoneToJid(phone: string): string {
    const cleaned = phone.replace(/[^0-9]/g, '');
    return `${cleaned}@s.whatsapp.net`;
  }
}
