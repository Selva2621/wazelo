import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  buildLayout,
  buildButton,
  buildNote,
  buildRoleBadge,
} from './email-templates';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    const port = this.configService.get<number>('email.port');
    const user = this.configService.get<string>('email.user');
    const pass = this.configService.get<string>('email.pass');
    this.frontendUrl =
      this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000';

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('email.host'),
      port,
      secure: port === 465,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
  }

  async send(payload: EmailPayload): Promise<void> {
    const from = this.configService.get<string>('email.from');
    try {
      await this.transporter.sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      });
      this.logger.log(`Email sent to ${payload.to}: ${payload.subject}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${payload.to}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  // ─── Re-export layout helpers so workers can use them via EmailService ────

  buildLayout(opts: { preheader?: string; body: string; showFooterLinks?: boolean }): string {
    return buildLayout({ ...opts, frontendUrl: this.frontendUrl });
  }

  buildButton(text: string, url: string, variant: 'primary' | 'danger' = 'primary'): string {
    return buildButton(text, url, variant);
  }

  buildNote(text: string): string {
    return buildNote(text);
  }

  // ─── Verification Email ───────────────────────────────────────────────────

  buildVerificationEmail(
    firstName: string,
    verificationUrl: string,
  ): { subject: string; html: string } {
    const body = `
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">
        Confirm your email address
      </h1>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#374151;">
        Hi <strong>${firstName}</strong>, welcome to Wazelo CRM! 🎉
      </p>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">
        You're one step away from your WhatsApp CRM. Click below to verify your email and activate your account.
      </p>
      ${buildButton('Verify Email Address', verificationUrl)}
      ${buildNote("This link expires in <strong>24 hours</strong>. If you didn't create a Wazelo CRM account, you can safely ignore this email.")}
    `;
    return {
      subject: 'Verify your email — Wazelo CRM',
      html: buildLayout({
        preheader: `Hi ${firstName}, confirm your email to get started with Wazelo CRM.`,
        body,
        frontendUrl: this.frontendUrl,
      }),
    };
  }

  // ─── Password Reset Email ─────────────────────────────────────────────────

  buildPasswordResetEmail(
    firstName: string,
    resetUrl: string,
  ): { subject: string; html: string } {
    const body = `
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">
        Reset your password
      </h1>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#374151;">
        Hi <strong>${firstName}</strong>,
      </p>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">
        We received a request to reset the password for your Wazelo CRM account. Click below to choose a new password.
      </p>
      ${buildButton('Reset Password', resetUrl)}
      ${buildNote("This link expires in <strong>15 minutes</strong> for your security. If you didn't request a password reset, no action is needed — your account remains secure.")}
    `;
    return {
      subject: 'Reset your password — Wazelo CRM',
      html: buildLayout({
        preheader: 'Reset your Wazelo CRM password. This link expires in 15 minutes.',
        body,
        frontendUrl: this.frontendUrl,
      }),
    };
  }

  // ─── Invitation Email ─────────────────────────────────────────────────────

  buildInvitationEmail(
    role: string,
    inviteUrl: string,
    orgName?: string,
  ): { subject: string; html: string } {
    const roleLabel = role.charAt(0) + role.slice(1).toLowerCase();
    const orgText   = orgName ? ` to <strong>${orgName}</strong>` : '';
    const featuresByRole: Record<string, string> = {
      ADMIN:    '✓ Full account management &nbsp; ✓ Billing &amp; settings &nbsp; ✓ All team features',
      MANAGER:  '✓ Team management &nbsp; ✓ Campaigns &nbsp; ✓ Reports &amp; analytics',
      EMPLOYEE: '✓ Shared inbox &nbsp; ✓ Contact management &nbsp; ✓ Conversations',
    };
    const features = featuresByRole[role] ?? '✓ Access to Wazelo CRM workspace';

    const body = `
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">
        You've been invited to Wazelo CRM
      </h1>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#374151;">
        You've been invited${orgText} as a ${buildRoleBadge(roleLabel)}.
      </p>
      <p style="margin:8px 0 0;font-size:15px;line-height:1.7;color:#374151;">
        Click below to accept your invitation and set up your account. No existing account needed.
      </p>
      ${buildButton('Accept Invitation', inviteUrl)}
      <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-top:8px;">
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.7;">
          <strong style="color:#374151;">What you get as ${roleLabel}:</strong><br>
          ${features}
        </p>
      </div>
      ${buildNote("This invitation expires in <strong>48 hours</strong>. If you didn't expect this, you can safely ignore this email.")}
    `;
    return {
      subject: "You've been invited to join Wazelo CRM",
      html: buildLayout({
        preheader: `You've been invited to join Wazelo CRM as a ${roleLabel}.`,
        body,
        frontendUrl: this.frontendUrl,
      }),
    };
  }
}
