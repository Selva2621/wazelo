import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MetricsRepository } from '@/modules/observability/infrastructure/repositories/metrics.repository';
import { OBSERVABILITY_CONFIG } from '@/common/constants';
import { ErrorTrackingService } from '@/modules/observability/domain/services/error-tracking.service';

@Injectable()
export class MetricCleanupWorker {
  private readonly logger = new Logger(MetricCleanupWorker.name);

  constructor(
    private readonly metricsRepository: MetricsRepository,
    private readonly errorTrackingService: ErrorTrackingService,
  ) {}

  /**
   * Run metric cleanup every 6 hours.
   * Deletes metric snapshots older than retention period.
   */
  @Cron('0 */6 * * *')
  async cleanupMetrics(): Promise<void> {
    try {
      const cutoff = new Date(
        Date.now() -
          OBSERVABILITY_CONFIG.METRIC_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );

      const deleted = await this.metricsRepository.deleteOlderThan(cutoff);
      this.logger.log(
        `Metric cleanup: deleted ${deleted} snapshots older than ${cutoff.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        'Metric cleanup failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Run error fingerprint cleanup every 5 minutes.
   * Removes stale error groups from in-memory tracking.
   */
  @Cron('*/5 * * * *')
  cleanupErrors(): void {
    try {
      this.errorTrackingService.cleanup();
    } catch (error) {
      this.logger.error(
        'Error fingerprint cleanup failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
