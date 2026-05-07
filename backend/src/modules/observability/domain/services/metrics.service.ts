import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  MetricsRepository,
  CreateMetricInput,
} from '../../infrastructure/repositories/metrics.repository';
import { OBSERVABILITY_CONFIG, METRIC_NAMES } from '@/common/constants';
import { QueueService } from '@/infrastructure/queue/queue.service';

@Injectable()
export class MetricsService implements OnModuleDestroy {
  private readonly logger = new Logger(MetricsService.name);
  private buffer: CreateMetricInput[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;

  // In-memory counters for high-frequency metrics (avoid DB write per request)
  private counters = new Map<string, { value: number; tags?: Record<string, unknown> }>();
  private histograms = new Map<string, number[]>();

  constructor(
    private readonly metricsRepository: MetricsRepository,
    private readonly queueService: QueueService,
  ) {
    this.flushTimer = setInterval(
      () => this.flush(),
      OBSERVABILITY_CONFIG.METRIC_FLUSH_INTERVAL_MS,
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  /**
   * Record a single metric data point.
   * Buffered — writes happen in batches.
   */
  record(metric: string, value: number, tags?: Record<string, unknown>, orgId?: string): void {
    this.buffer.push({ metric, value, tags, orgId });

    if (this.buffer.length >= OBSERVABILITY_CONFIG.METRIC_BUFFER_SIZE) {
      this.flush().catch((err) => {
        this.logger.error('Metric flush error', err instanceof Error ? err.stack : String(err));
      });
    }
  }

  /**
   * Increment a counter metric. Flushed periodically.
   * Use for request counts, error counts, etc.
   */
  increment(metric: string, amount: number = 1, tags?: Record<string, unknown>): void {
    const key = `${metric}:${JSON.stringify(tags ?? {})}`;
    const existing = this.counters.get(key);
    if (existing) {
      existing.value += amount;
    } else {
      this.counters.set(key, { value: amount, tags });
    }
  }

  /**
   * Record a histogram value (e.g., latency).
   * P50/P95/P99 calculated on flush.
   */
  recordHistogram(metric: string, value: number): void {
    const existing = this.histograms.get(metric);
    if (existing) {
      existing.push(value);
    } else {
      this.histograms.set(metric, [value]);
    }
  }

  /**
   * Record API request metrics.
   */
  recordApiRequest(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    orgId?: string,
  ): void {
    const tags = { method, path: this.normalizePath(path), statusCode };

    this.record(METRIC_NAMES.API_LATENCY, durationMs, tags, orgId);
    this.increment(METRIC_NAMES.API_REQUEST_COUNT, 1, tags);

    if (statusCode >= 400) {
      this.increment(METRIC_NAMES.API_ERROR_COUNT, 1, tags);
    }

    this.recordHistogram(METRIC_NAMES.API_LATENCY, durationMs);
  }

  /**
   * Record queue metrics.
   */
  recordQueueMetric(
    queueName: string,
    metric: 'depth' | 'processing_time' | 'failed',
    value: number,
  ): void {
    const metricName =
      metric === 'depth'
        ? METRIC_NAMES.QUEUE_DEPTH
        : metric === 'processing_time'
          ? METRIC_NAMES.QUEUE_PROCESSING_TIME
          : METRIC_NAMES.QUEUE_FAILED_JOBS;

    this.record(metricName, value, { queue: queueName });
  }

  /**
   * Get aggregated metrics for dashboard display.
   */
  async getAggregated(
    metric: string,
    startDate: Date,
    endDate: Date,
    orgId?: string,
  ) {
    return this.metricsRepository.getAggregated(metric, startDate, endDate, orgId);
  }

  /**
   * Get time-series data for chart rendering.
   */
  async getTimeSeries(
    metric: string,
    startDate: Date,
    endDate: Date,
    orgId?: string,
  ) {
    return this.metricsRepository.getTimeSeries(metric, startDate, endDate, orgId);
  }

  /**
   * Get latest value of all tracked metrics.
   */
  async getLatest(orgId?: string) {
    return this.metricsRepository.getLatestMetrics(orgId);
  }

  /**
   * Flush all buffered metrics + counters + histograms to the database.
   */
  private async flush(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;

    try {
      const toWrite: CreateMetricInput[] = [];

      // Drain the point buffer
      if (this.buffer.length > 0) {
        toWrite.push(...this.buffer.splice(0, this.buffer.length));
      }

      // Flush counters
      for (const [key, data] of this.counters.entries()) {
        const metric = key.split(':')[0];
        toWrite.push({
          metric,
          value: data.value,
          tags: data.tags,
        });
      }
      this.counters.clear();

      // Flush histograms as percentile summaries
      for (const [metric, values] of this.histograms.entries()) {
        if (values.length === 0) continue;
        values.sort((a, b) => a - b);

        const p50 = values[Math.floor(values.length * 0.5)];
        const p95 = values[Math.floor(values.length * 0.95)];
        const p99 = values[Math.floor(values.length * 0.99)];
        const avg = values.reduce((a, b) => a + b, 0) / values.length;

        toWrite.push(
          { metric: `${metric}_p50`, value: p50 },
          { metric: `${metric}_p95`, value: p95 },
          { metric: `${metric}_p99`, value: p99 },
          { metric: `${metric}_avg`, value: avg },
        );
      }
      this.histograms.clear();

      if (toWrite.length > 0) {
        await this.metricsRepository.createMany(toWrite);
      }
    } catch (error) {
      this.logger.error(
        'Metric flush failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.flushing = false;
    }
  }

  /**
   * Normalize API path to prevent high-cardinality metrics.
   * e.g., /api/v1/contacts/550e8400-e29b-41d4-a716-446655440000 → /api/v1/contacts/:id
   */
  private normalizePath(path: string): string {
    return path
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ':id',
      )
      .replace(/\/\d+/g, '/:id');
  }
}
