import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { QUEUE_NAMES } from '@/common/constants';
import {
  IdleCheckJob,
  OfferTimeoutJob,
  WaitTimeoutJob,
  WebsiteHandoffService,
} from '@/modules/widget/application/services/website-handoff.service';

/**
 * Website chat handover timers. They live in the queue (not in memory), so a
 * restart never loses one: an offer that ran out goes to the next member, and a
 * visitor nobody took is offered a WhatsApp / email follow-up.
 */
@Injectable()
export class WebsiteHandoffWorker implements OnModuleInit {
  private readonly logger = new Logger(WebsiteHandoffWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly handoff: WebsiteHandoffService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribe<OfferTimeoutJob>(QUEUE_NAMES.WIDGET_OFFER_TIMEOUT, async (job) => {
      await this.handoff.onOfferTimeout(job.data);
    });
    await this.queueService.subscribe<WaitTimeoutJob>(QUEUE_NAMES.WIDGET_WAIT_TIMEOUT, async (job) => {
      await this.handoff.onWaitTimeout(job.data);
    });
    await this.queueService.subscribe<IdleCheckJob>(QUEUE_NAMES.WIDGET_IDLE_CHECK, async (job) => {
      await this.handoff.onIdleCheck(job.data);
    });
    this.logger.log('Website handoff worker started');
  }
}
