import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { QUEUE_NAMES } from '@/common/constants';
import { OrgEmailService, SendOrgEmailJob } from '@/modules/email/application/services/org-email.service';

/** Sends emails from each workspace's own mailbox, a few at a time (the queue retries busy servers). */
@Injectable()
export class SendOrgEmailWorker implements OnModuleInit {
  private readonly logger = new Logger(SendOrgEmailWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly email: OrgEmailService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribe<SendOrgEmailJob>(
      QUEUE_NAMES.SEND_ORG_EMAIL,
      async (job) => {
        await this.email.deliver(job.data);
      },
      { teamSize: 3, teamConcurrency: 1 },
    );
    this.logger.log('Org email worker started');
  }
}
