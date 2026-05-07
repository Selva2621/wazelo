import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { MetricsService } from '@/modules/observability/domain/services/metrics.service';
import { QUEUE_NAMES, OBSERVABILITY_CONFIG } from '@/common/constants';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';

@Injectable()
export class QueueMetricsWorker {
  private readonly logger = new Logger(QueueMetricsWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly metricsService: MetricsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Collect queue depth metrics every 30 seconds.
   * Records metrics for dashboard and alert evaluation.
   */
  @Cron('*/30 * * * * *')
  async collectQueueMetrics(): Promise<void> {
    const queueNames = Object.values(QUEUE_NAMES);

    const results = await Promise.allSettled(
      queueNames.map(async (name) => {
        const size = await this.queueService.getQueueSize(name);
        return { name, size };
      }),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { name, size } = result.value;
        this.metricsService.recordQueueMetric(name, 'depth', size);

        // Emit warning event if queue depth exceeds threshold
        if (size >= OBSERVABILITY_CONFIG.QUEUE_DEPTH_CRITICAL) {
          this.eventEmitter.emit(EVENT_NAMES.HEALTH_CHECK_FAILED, {
            component: 'queue',
            queue: name,
            depth: size,
            threshold: OBSERVABILITY_CONFIG.QUEUE_DEPTH_CRITICAL,
            severity: 'critical',
            timestamp: new Date().toISOString(),
          });
        } else if (size >= OBSERVABILITY_CONFIG.QUEUE_DEPTH_WARNING) {
          this.logger.warn(
            `Queue "${name}" depth ${size} exceeds warning threshold ${OBSERVABILITY_CONFIG.QUEUE_DEPTH_WARNING}`,
          );
        }
      }
    }
  }
}
