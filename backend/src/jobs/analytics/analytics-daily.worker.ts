import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { QUEUE_NAMES } from '@/common/constants';
import { AnalyticsAggregationRepository } from '@/modules/analytics/infrastructure/repositories/analytics-aggregation.repository';

interface DailyAggregateJobData {
  targetDate: string;
}

@Injectable()
export class AnalyticsDailyWorker implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsDailyWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly aggregationRepo: AnalyticsAggregationRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribe<DailyAggregateJobData>(
      QUEUE_NAMES.ANALYTICS_DAILY_AGGREGATE,
      async (job) => this.handle(job.data),
    );
    this.logger.log('AnalyticsDailyWorker subscribed');
  }

  private async handle(data: DailyAggregateJobData): Promise<void> {
    const { targetDate } = data;
    const date = new Date(targetDate);
    this.logger.log(`Running daily analytics aggregation for ${targetDate}`);

    const start = Date.now();

    await this.aggregationRepo.aggregateMessageDaily(date);
    await this.aggregationRepo.aggregateResponseTimeDaily(date);
    await this.aggregationRepo.aggregateConversionDaily(date);
    await this.aggregationRepo.aggregateCampaignSummaryDaily(date);

    const duration = Date.now() - start;
    this.logger.log(
      `Daily analytics aggregation completed for ${targetDate} in ${duration}ms`,
    );
  }

  /**
   * Cron: 00:15 UTC — aggregate yesterday's data.
   */
  @Cron('15 0 * * *')
  async scheduleDailyAggregation(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);

    await this.queueService.publishOnce<DailyAggregateJobData>(
      QUEUE_NAMES.ANALYTICS_DAILY_AGGREGATE,
      { targetDate: dateStr },
      `daily-${dateStr}`,
    );
    this.logger.log(`Scheduled daily analytics aggregation for ${dateStr}`);
  }
}
