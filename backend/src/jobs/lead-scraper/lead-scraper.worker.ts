import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { ProcessScrapeRunUseCase } from '@/modules/lead-scraper/application/use-cases/process-scrape-run.use-case';
import { ScrapeRunRepository } from '@/modules/lead-scraper/infrastructure/repositories/scrape-run.repository';
import { MAX_RUN_MS } from '@/modules/lead-scraper/domain/services/scrape-timeout';
import { QUEUE_NAMES } from '@/common/constants';

interface ScrapeLeadsJobData {
  scrapeRunId: string;
}

/** Grace on top of the run limit before the sweep treats a RUNNING run as stuck */
const STUCK_GRACE_MS = 5 * 60_000;

@Injectable()
export class LeadScraperWorker implements OnModuleInit {
  private readonly logger = new Logger(LeadScraperWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly processScrapeRunUseCase: ProcessScrapeRunUseCase,
    private readonly scrapeRunRepository: ScrapeRunRepository,
  ) {}

  async onModuleInit() {
    // Single backend instance: anything RUNNING at boot lost its worker in the restart
    const orphaned = await this.scrapeRunRepository.failRunning(
      new Date(),
      'Interrupted by a server restart — run it again',
    );
    if (orphaned) this.logger.warn(`Marked ${orphaned} interrupted scrape run(s) as failed`);

    await this.queueService.subscribeConcurrent<ScrapeLeadsJobData>(
      QUEUE_NAMES.SCRAPE_LEADS,
      async (job) => this.handle(job.data),
      2, // low concurrency — Playwright is memory-heavy
    );

    this.logger.log('LeadScraperWorker subscribed to scrape-leads queue');
  }

  /** Backstop for a run that outlived its deadline without finishing */
  @Cron('0 */5 * * * *')
  async failStuckRuns() {
    const stuck = await this.scrapeRunRepository.failRunning(
      new Date(Date.now() - MAX_RUN_MS - STUCK_GRACE_MS),
      'Stopped — the run stopped responding',
    );
    if (stuck) this.logger.warn(`Marked ${stuck} stuck scrape run(s) as failed`);
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
