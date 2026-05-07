import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { EmailService } from '@/infrastructure/email/email.service';
import { UserRepository } from '@/modules/users/infrastructure/repositories/user.repository';
import { QUEUE_NAMES, NOTIFICATION_CONFIG } from '@/common/constants';
import { NotificationType, NotificationPriority } from '@prisma/client';
import { buildButton, buildInfoBox, buildNote } from '@/infrastructure/email/email-templates';
import PgBoss from 'pg-boss';

interface NotificationEmailJob {
  orgId: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationEmailWorker implements OnModuleInit {
  private readonly logger = new Logger(NotificationEmailWorker.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly queueService: QueueService,
    private readonly emailService: EmailService,
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000';
  }

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribeConcurrent<NotificationEmailJob>(
      QUEUE_NAMES.SEND_NOTIFICATION_EMAIL,
      async (job: PgBoss.Job<NotificationEmailJob>) => {
        await this.handleJob(job.data);
      },
      NOTIFICATION_CONFIG.EMAIL_WORKER_CONCURRENCY,
    );
    this.logger.log('Notification email worker subscribed');
  }

  private async handleJob(data: NotificationEmailJob): Promise<void> {
    const user = await this.userRepository.findById(data.userId);
    if (!user || user.deletedAt) {
      this.logger.warn(`Skipping notification email: user ${data.userId} not found or deleted`);
      return;
    }

    const { subject, html } = this.buildEmail(
      data.type,
      data.priority,
      data.title,
      data.body,
      user.firstName,
      data.data,
    );

    await this.emailService.send({ to: user.email, subject, html });
    this.logger.log(`Notification email sent to ${user.email}: type=${data.type}`);
  }

  private buildEmail(
    type: NotificationType,
    priority: NotificationPriority,
    title: string,
    body: string,
    firstName: string,
    data?: Record<string, unknown>,
  ): { subject: string; html: string } {
    const priorityEmoji = priority === 'CRITICAL' ? '🚨 ' : priority === 'HIGH' ? '⚠️ ' : '';
    const subject = `${priorityEmoji}${title} — Wazelo CRM`;

    const priorityBanner =
      priority === 'CRITICAL'
        ? buildInfoBox('Critical Alert — immediate action required', 'error')
        : priority === 'HIGH'
          ? buildInfoBox('Important notification', 'warning')
          : '';

    const innerBody = `
      ${priorityBanner}
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">
        ${title}
      </h1>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">
        Hi <strong>${firstName}</strong>, ${body}
      </p>
      ${this.buildActionButton(type, data)}
      ${buildNote(
        `You're receiving this because you have email notifications enabled. ` +
        `<a href="${this.frontendUrl}/settings/notifications" style="color:#d97706;text-decoration:none;font-weight:500;">Manage preferences</a>`
      )}
    `;

    const html = this.emailService.buildLayout({
      preheader: `${title} — ${body.slice(0, 80)}`,
      body: innerBody,
    });

    return { subject, html };
  }

  private buildActionButton(
    type: NotificationType,
    data?: Record<string, unknown>,
  ): string {
    const actions: Partial<Record<NotificationType, { label: string; url: string }>> = {
      MESSAGE_RECEIVED:             { label: 'View Conversation',  url: `${this.frontendUrl}/inbox/${data?.conversationId ?? ''}` },
      CAMPAIGN_COMPLETED:           { label: 'View Campaign',      url: `${this.frontendUrl}/campaigns/${data?.campaignId ?? ''}` },
      CAMPAIGN_FAILED:              { label: 'View Campaign',      url: `${this.frontendUrl}/campaigns/${data?.campaignId ?? ''}` },
      PAYMENT_FAILED:               { label: 'Manage Billing',     url: `${this.frontendUrl}/settings/billing` },
      SUBSCRIPTION_EXPIRING:        { label: 'Manage Billing',     url: `${this.frontendUrl}/settings/billing` },
      WHATSAPP_SESSION_DISCONNECTED:{ label: 'Reconnect Session',  url: `${this.frontendUrl}/settings/whatsapp` },
      CONTACT_ASSIGNED:             { label: 'View Contact',       url: `${this.frontendUrl}/contacts/${data?.contactId ?? ''}` },
      CONTACT_REASSIGNED:           { label: 'View Contact',       url: `${this.frontendUrl}/contacts/${data?.contactId ?? ''}` },
      SLA_BREACH:                   { label: 'View Conversation',  url: `${this.frontendUrl}/inbox/${data?.conversationId ?? ''}` },
      TICKET_REPLY:                 { label: 'View Ticket',        url: `${this.frontendUrl}/support/${data?.ticketId ?? ''}` },
      TICKET_RESOLVED:              { label: 'View Ticket',        url: `${this.frontendUrl}/support/${data?.ticketId ?? ''}` },
      AUTOMATION_EXECUTED:          { label: 'View Automations',   url: `${this.frontendUrl}/automation` },
      AUTOMATION_FAILED:            { label: 'View Automations',   url: `${this.frontendUrl}/automation` },
      USAGE_LIMIT_WARNING:          { label: 'View Usage',         url: `${this.frontendUrl}/settings/billing` },
      USAGE_LIMIT_REACHED:          { label: 'Upgrade Plan',       url: `${this.frontendUrl}/settings/billing` },
    };

    const action = actions[type] ?? {
      label: 'Go to Dashboard',
      url: `${this.frontendUrl}/notifications`,
    };

    return buildButton(action.label, action.url);
  }
}
