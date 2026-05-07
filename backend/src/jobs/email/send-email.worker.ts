import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { EmailService } from '@/infrastructure/email/email.service';
import { QUEUE_NAMES } from '@/common/constants';
import PgBoss from 'pg-boss';

interface VerificationEmailJob {
  type: 'verification';
  to: string;
  firstName: string;
  token: string;
  verificationUrl: string;
}

interface PasswordResetEmailJob {
  type: 'password_reset';
  to: string;
  firstName: string;
  token: string;
  resetUrl: string;
}

type EmailJob = VerificationEmailJob | PasswordResetEmailJob;

@Injectable()
export class SendEmailWorker implements OnModuleInit {
  private readonly logger = new Logger(SendEmailWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly emailService: EmailService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribe<EmailJob>(
      QUEUE_NAMES.SEND_EMAIL,
      async (job: PgBoss.Job<EmailJob>) => {
        await this.handleJob(job.data);
      },
    );
    this.logger.log('Send email worker subscribed');
  }

  private async handleJob(data: EmailJob): Promise<void> {
    switch (data.type) {
      case 'verification': {
        const emailContent = this.emailService.buildVerificationEmail(
          data.firstName,
          data.verificationUrl,
        );
        await this.emailService.send({
          to: data.to,
          subject: emailContent.subject,
          html: emailContent.html,
        });
        this.logger.log(`Verification email sent to ${data.to}`);
        break;
      }

      case 'password_reset': {
        const emailContent = this.emailService.buildPasswordResetEmail(
          data.firstName,
          data.resetUrl,
        );
        await this.emailService.send({
          to: data.to,
          subject: emailContent.subject,
          html: emailContent.html,
        });
        this.logger.log(`Password reset email sent to ${data.to}`);
        break;
      }

      default: {
        this.logger.warn(`Unknown email job type: ${(data as EmailJob).type}`);
      }
    }
  }
}
