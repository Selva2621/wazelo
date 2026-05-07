import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { QUEUE_NAMES, ANALYTICS_CONFIG } from '@/common/constants';
import { AnalyticsAggregationRepository } from '@/modules/analytics/infrastructure/repositories/analytics-aggregation.repository';

interface HourlyAggregateJobData {
  targetHour: string;
}

@Injectable()
export class AnalyticsHourlyWorker implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsHourlyWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly aggregationRepo: AnalyticsAggregationRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribe<HourlyAggregateJobData>(
      QUEUE_NAMES.ANALYTICS_HOURLY_AGGREGATE,
      async (job) => this.handle(job.data),
    );
    this.logger.log('AnalyticsHourlyWorker subscribed');
  }

  private async handle(data: HourlyAggregateJobData): Promise<void> {
    const targetHour = new Date(data.targetHour);
    this.logger.log(
      `Running hourly analytics aggregation for ${data.targetHour}`,
    );

    await this.aggregationRepo.aggregateMessageHourly(targetHour);

    this.logger.log(
      `Hourly analytics aggregation completed for ${data.targetHour}`,
    );
  }

  /**
   * Cron: 5 minutes past every hour — aggregate previous hour.
   */
  @Cron('5 * * * *')
  async scheduleHourlyAggregation(): Promise<void> {
    const prevHour = new Date();
    prevHour.setHours(prevHour.getHours() - 1, 0, 0, 0);

    await this.queueService.publishOnce<HourlyAggregateJobData>(
      QUEUE_NAMES.ANALYTICS_HOURLY_AGGREGATE,
      { targetHour: prevHour.toISOString() },
      `hourly-${prevHour.toISOString()}`,
    );
  }

  /**
   * Cron: 03:00 UTC — cleanup old analytics data.
   */
  @Cron('0 3 * * *')
  async cleanupOldData(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ANALYTICS_CONFIG.RETENTION_DAYS);

    const result = await this.aggregationRepo.deleteOlderThan(cutoff);
    this.logger.log(
      `Analytics cleanup: daily=${result.daily}, hourly=${result.hourly}, response=${result.response}, conversion=${result.conversion}, campaign=${result.campaign}`,
    );
  }
}
