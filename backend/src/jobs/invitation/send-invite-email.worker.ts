import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { EmailService } from '@/infrastructure/email/email.service';
import { QUEUE_NAMES } from '@/common/constants';
import PgBoss from 'pg-boss';

interface InviteEmailJob {
  type: 'invitation';
  to: string;
  role: string;
  token: string;
  inviteUrl: string;
  orgId: string;
  orgName?: string;
  invitationId: string;
}

@Injectable()
export class SendInviteEmailWorker implements OnModuleInit {
  private readonly logger = new Logger(SendInviteEmailWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly emailService: EmailService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribe<InviteEmailJob>(
      QUEUE_NAMES.SEND_INVITE_EMAIL,
      async (job: PgBoss.Job<InviteEmailJob>) => {
        await this.handleJob(job.data);
      },
    );
    this.logger.log('Send invite email worker subscribed');
  }

  private async handleJob(data: InviteEmailJob): Promise<void> {
    const { subject, html } = this.emailService.buildInvitationEmail(
      data.role,
      data.inviteUrl,
      data.orgName,
    );
    await this.emailService.send({
      to: data.to,
      subject,
      html,
    });
    this.logger.log(
      `Invitation email sent to ${data.to} for org (invitation: ${data.invitationId})`,
    );
  }
}
