import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { QUEUE_NAMES } from '@/common/constants';
import {
  NoReplyCheckJob,
  RunNoReplyCheckUseCase,
} from '@/modules/automation/application/use-cases/no-reply.use-cases';

/** Runs the delayed NO_REPLY checks: did the contact answer our message in time? */
@Injectable()
export class NoReplyWorker implements OnModuleInit {
  private readonly logger = new Logger(NoReplyWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly runCheck: RunNoReplyCheckUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribe<NoReplyCheckJob>(QUEUE_NAMES.AUTOMATION_NO_REPLY, async (job) => {
      await this.runCheck.execute(job.data);
    });
    this.logger.log('No-reply worker started');
  }
}
