import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import {
  WaCheckJobData,
  WhatsAppCheckRunUseCase,
} from '@/modules/lead-scraper/application/use-cases/whatsapp-check-run.use-case';
import { QUEUE_NAMES } from '@/common/constants';

@Injectable()
export class ScrapeWaCheckWorker implements OnModuleInit {
  private readonly logger = new Logger(ScrapeWaCheckWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly whatsAppCheckRun: WhatsAppCheckRunUseCase,
  ) {}

  async onModuleInit() {
    // Each job is one lookup and queues the next; the per-session throttle keeps
    // parallel runs within WhatsApp-safe limits
    await this.queueService.subscribeConcurrent<WaCheckJobData>(
      QUEUE_NAMES.SCRAPE_WA_CHECK,
      async (job) => this.whatsAppCheckRun.step(job.data),
      2,
    );
    this.logger.log('ScrapeWaCheckWorker subscribed to scrape-wa-check queue');
  }
}
