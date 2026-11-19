import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

export interface OutgoingEmail {
  from: { name: string; address: string };
  replyTo?: string | null;
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Lets mail apps show their own "Unsubscribe" button */
  unsubscribeUrl: string;
}

/** Mail server answers that won't change on a retry (wrong login, bad address, rejected) */
export function isPermanentSmtpError(err: unknown): boolean {
  const e = err as { code?: string; responseCode?: number };
  if (e?.code === 'EAUTH' || e?.code === 'EENVELOPE') return true;
  return typeof e?.responseCode === 'number' && e.responseCode >= 500 && e.responseCode < 600;
}

/** Talks to a workspace's own mail server over SMTP. No business rules here. */
@Injectable()
export class SmtpMailer {
  private transport(s: SmtpSettings) {
    return nodemailer.createTransport({
      host: s.host,
      port: s.port,
      secure: s.secure,
      requireTLS: !s.secure,
      auth: { user: s.username, pass: s.password },
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
  }

  /** Logs in to the server; throws the server's reason when it can't */
  async verify(s: SmtpSettings): Promise<void> {
    const t = this.transport(s);
    try {
      await t.verify();
    } finally {
      t.close();
    }
  }

  async send(s: SmtpSettings, mail: OutgoingEmail): Promise<{ messageId: string }> {
    const t = this.transport(s);
    try {
      const info = await t.sendMail({
        from: mail.from,
        replyTo: mail.replyTo || undefined,
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        headers: {
          'List-Unsubscribe': `<${mail.unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
      return { messageId: String(info.messageId ?? '') };
    } finally {
      t.close();
    }
  }
}
