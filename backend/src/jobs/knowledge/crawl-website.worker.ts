import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { QUEUE_NAMES } from '@/common/constants';
import {
  CrawlWebsiteJobData,
  ProcessWebsiteSourceUseCase,
  ResyncDueWebsitesUseCase,
} from '@/modules/knowledge-base/application/use-cases/kb-sources.use-cases';
import { KbSourceRepository } from '@/modules/knowledge-base/infrastructure/repositories/kb-source.repository';

/** Reads org websites into the knowledge base, one or two at a time, and re-reads weekly ones. */
@Injectable()
export class CrawlWebsiteWorker implements OnModuleInit {
  private readonly logger = new Logger(CrawlWebsiteWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly processSource: ProcessWebsiteSourceUseCase,
    private readonly resyncDue: ResyncDueWebsitesUseCase,
    private readonly sources: KbSourceRepository,
  ) {}

  async onModuleInit() {
    // Single backend instance: a crawl in progress at boot lost its worker in the restart
    const orphaned = await this.sources.failCrawling('Interrupted by a server restart — read the website again');
    if (orphaned) this.logger.warn(`Marked ${orphaned} interrupted website crawl(s) as failed`);

    await this.queueService.subscribeConcurrent<CrawlWebsiteJobData>(
      QUEUE_NAMES.CRAWL_WEBSITE,
      async (job) => this.processSource.execute(job.data.sourceId),
      2,
    );
    this.logger.log('CrawlWebsiteWorker subscribed to crawl-website queue');
  }

  /** Daily, off-peak: queue websites with weekly re-read on that are a week old. */
  @Cron('30 3 * * *')
  async resyncWeekly(): Promise<void> {
    try {
      await this.resyncDue.execute();
    } catch (err) {
      this.logger.error(`Weekly website re-read failed: ${(err as Error).message}`);
    }
  }
}
