import { Injectable, Logger } from '@nestjs/common';
import { ChannelType, MessageType } from '@prisma/client';
import { createHmac } from 'crypto';
import * as nodemailer from 'nodemailer';
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

const EMAIL_CAPABILITIES: ChannelCapabilities = {
  supportedMessageTypes: [
    MessageType.TEXT,
    MessageType.IMAGE,
    MessageType.DOCUMENT,
  ],
  supportsReactions: false,
  supportsReadReceipts: false,
  supportsTypingIndicators: false,
  supportsMedia: true,
  maxTextLength: 1_000_000,
  maxMediaSizeMb: 25,
  supportedMediaMimeTypes: ['*/*'],
  supportsGroupChat: false,
  requiresContactOptIn: false,
};

@Injectable()
export class EmailChannelAdapter implements ChannelAdapter {
  readonly channelType = ChannelType.EMAIL;
  private readonly logger = new Logger(EmailChannelAdapter.name);

  async sendMessage(
    message: OutboundMessage,
    config: Record<string, unknown>,
  ): Promise<OutboundResult> {
    const transporter = this.createTransporter(config);

    const mailOptions: nodemailer.SendMailOptions = {
      from: `${config.fromName || ''} <${config.fromAddress}>`,
      to: message.recipientIdentifier,
      subject:
        (message.channelPayload?.subject as string) || 'No Subject',
      messageId: `<${message.idempotencyKey}@wazelo>`,
    };

    if (message.type === MessageType.TEXT) {
      mailOptions.text = message.body;
    } else {
      mailOptions.html = message.body;
      mailOptions.text = message.channelPayload?.textBody as string;
    }

    if (message.channelPayload?.cc) {
      mailOptions.cc = message.channelPayload.cc as string;
    }
    if (message.channelPayload?.bcc) {
      mailOptions.bcc = message.channelPayload.bcc as string;
    }
    if (message.channelPayload?.replyTo) {
      mailOptions.replyTo = message.channelPayload.replyTo as string;
    }
    if (message.channelPayload?.inReplyTo) {
      mailOptions.inReplyTo = message.channelPayload
        .inReplyTo as string;
      mailOptions.references = message.channelPayload
        .inReplyTo as string;
    }

    if (message.mediaUrl) {
      mailOptions.attachments = [
        {
          path: message.mediaUrl,
          filename:
            (message.channelPayload?.filename as string) ||
            'attachment',
        },
      ];
    }

    try {
      const info = await transporter.sendMail(mailOptions);
      return {
        success: true,
        externalMessageId: info.messageId,
        providerResponse: {
          accepted: info.accepted,
          rejected: info.rejected,
        },
        retryable: false,
      };
    } catch (error: any) {
      // EAUTH = authentication failure, EENVELOPE = invalid recipient
      const retryable = !['EAUTH', 'EENVELOPE'].includes(error.code);
      this.logger.error(`Email send failed: ${error.message}`, error.stack);
      return { success: false, error: error.message, retryable };
    } finally {
      transporter.close();
    }
  }

  parseInboundEvent(
    rawEvent: Record<string, unknown>,
  ): InboundMessagePayload | null {
    // Inbound emails parsed from IMAP polling or webhook provider
    // (e.g., SendGrid Inbound Parse, Mailgun Routes)
    const email = rawEvent as any;
    if (!email.messageId && !email['Message-Id']) return null;

    return {
      externalMessageId: email.messageId || email['Message-Id'],
      senderIdentifier: email.from,
      senderName: email.fromName,
      type: email.html ? MessageType.TEXT : MessageType.TEXT,
      body: email.html || email.text,
      timestamp: new Date(email.date || Date.now()),
      channelPayload: {
        messageId: email.messageId,
        inReplyTo: email.inReplyTo,
        subject: email.subject,
        cc: email.cc,
        bcc: email.bcc,
        headers: email.headers,
      },
    };
  }

  parseStatusUpdate(
    rawEvent: Record<string, unknown>,
  ): StatusUpdatePayload | null {
    // Email DSN/bounce handling from SendGrid/Mailgun webhooks
    const event = rawEvent as any;
    if (!event.messageId || !event.event) return null;

    const statusMap: Record<string, 'DELIVERED' | 'FAILED'> = {
      delivered: 'DELIVERED',
      bounced: 'FAILED',
      dropped: 'FAILED',
      complained: 'FAILED',
    };

    const status = statusMap[event.event];
    if (!status) return null;

    return {
      externalMessageId: event.messageId,
      status,
      error: event.reason,
    };
  }

  async validateCredentials(
    config: Record<string, unknown>,
  ): Promise<CredentialValidationResult> {
    const transporter = this.createTransporter(config);

    try {
      await transporter.verify();
      return {
        valid: true,
        externalId: config.fromAddress as string,
        externalHandle: config.fromAddress as string,
        capabilities: EMAIL_CAPABILITIES,
      };
    } catch (error: any) {
      return {
        valid: false,
        externalId: '',
        externalHandle: '',
        capabilities: EMAIL_CAPABILITIES,
        error: error.message,
      };
    } finally {
      transporter.close();
    }
  }

  async registerWebhook(
    _config: Record<string, unknown>,
    _callbackUrl: string,
  ): Promise<WebhookRegistrationResult> {
    // Email inbound typically uses IMAP polling or external webhook
    // provider config (manual setup in SendGrid/Mailgun)
    return { webhookId: 'email-imap-poll' };
  }

  verifyWebhookSignature(
    payload: Buffer,
    signature: string,
    secret: string,
  ): boolean {
    const expected = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return expected === signature;
  }

  private createTransporter(
    config: Record<string, unknown>,
  ): nodemailer.Transporter {
    return nodemailer.createTransport({
      host: config.smtpHost as string,
      port: config.smtpPort as number,
      secure: (config.smtpPort as number) === 465,
      auth: {
        user: config.smtpUser as string,
        pass: config.smtpPass as string,
      },
      connectionTimeout: 10_000,
      socketTimeout: 30_000,
    });
  }
}
