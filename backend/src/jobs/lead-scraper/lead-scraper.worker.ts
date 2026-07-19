import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { ProcessScrapeRunUseCase } from '@/modules/lead-scraper/application/use-cases/process-scrape-run.use-case';
import { QUEUE_NAMES } from '@/common/constants';

interface ScrapeLeadsJobData {
  scrapeRunId: string;
}

@Injectable()
export class LeadScraperWorker implements OnModuleInit {
  private readonly logger = new Logger(LeadScraperWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly processScrapeRunUseCase: ProcessScrapeRunUseCase,
  ) {}

  async onModuleInit() {
    await this.queueService.subscribeConcurrent<ScrapeLeadsJobData>(
      QUEUE_NAMES.SCRAPE_LEADS,
      async (job) => this.handle(job.data),
      2, // low concurrency — Playwright is memory-heavy
    );

    this.logger.log('LeadScraperWorker subscribed to scrape-leads queue');
  }

  private async handle(data: ScrapeLeadsJobData): Promise<void> {
    this.logger.log(`Processing scrape run ${data.scrapeRunId}`);
    try {
      await this.processScrapeRunUseCase.execute(data.scrapeRunId);
      this.logger.log(`Scrape run ${data.scrapeRunId} completed`);
    } catch (err) {
      this.logger.error(`Scrape run ${data.scrapeRunId} failed: ${err.message}`, err.stack);
      throw err; // let pg-boss retry
    }
  }
}
