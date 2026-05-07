import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash } from 'crypto';
import { EVENT_NAMES, OBSERVABILITY_CONFIG, METRIC_NAMES } from '@/common/constants';
import { getTraceId } from '@/common/middleware/trace-id.middleware';
import { MetricsService } from './metrics.service';

export interface TrackedError {
  fingerprint: string;
  message: string;
  stack?: string;
  context?: string;
  traceId: string;
  orgId?: string;
  userId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ErrorTrackingService {
  private readonly logger = new Logger(ErrorTrackingService.name);

  /**
   * In-memory error grouping map.
   * Key = error fingerprint, Value = grouped error info.
   * Bounded by MAX_ERROR_FINGERPRINTS to prevent memory leak.
   */
  private errorGroups = new Map<string, TrackedError>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Track an error. Groups similar errors by fingerprint.
   * Emits ERROR_TRACKED event for downstream handling (alerting, logging).
   */
  trackError(
    error: Error | string,
    context?: {
      context?: string;
      orgId?: string;
      userId?: string;
      method?: string;
      url?: string;
      statusCode?: number;
      metadata?: Record<string, unknown>;
    },
  ): void {
    const message = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;
    const traceId = getTraceId();

    const fingerprint = this.generateFingerprint(message, stack, context?.context);

    const existing = this.errorGroups.get(fingerprint);
    if (existing) {
      existing.count++;
      existing.lastSeen = new Date();
      existing.traceId = traceId; // Update to latest trace
    } else {
      // Enforce max fingerprint limit to prevent memory leak
      if (this.errorGroups.size >= OBSERVABILITY_CONFIG.MAX_ERROR_FINGERPRINTS) {
        this.evictOldestError();
      }

      this.errorGroups.set(fingerprint, {
        fingerprint,
        message,
        stack,
        context: context?.context,
        traceId,
        orgId: context?.orgId,
        userId: context?.userId,
        method: context?.method,
        url: context?.url,
        statusCode: context?.statusCode,
        count: 1,
        firstSeen: new Date(),
        lastSeen: new Date(),
        metadata: context?.metadata,
      });
    }

    // Record error metric
    this.metricsService.increment(METRIC_NAMES.API_ERROR_COUNT, 1, {
      context: context?.context,
      statusCode: context?.statusCode,
    });

    // Emit event for alert evaluation
    this.eventEmitter.emit(EVENT_NAMES.ERROR_TRACKED, {
      fingerprint,
      message,
      stack,
      traceId,
      orgId: context?.orgId,
      userId: context?.userId,
      statusCode: context?.statusCode,
      count: this.errorGroups.get(fingerprint)?.count ?? 1,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get all tracked error groups (for dashboard).
   * Sorted by count descending (most frequent first).
   */
  getErrorGroups(): TrackedError[] {
    return Array.from(this.errorGroups.values())
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get error groups from the last N minutes.
   */
  getRecentErrors(windowMinutes: number = 60): TrackedError[] {
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
    return this.getErrorGroups().filter((e) => e.lastSeen >= cutoff);
  }

  /**
   * Get total error count in the current window.
   */
  getTotalErrorCount(): number {
    let total = 0;
    for (const group of this.errorGroups.values()) {
      total += group.count;
    }
    return total;
  }

  /**
   * Clear error groups that haven't been seen within the grouping window.
   * Called periodically to prevent stale data buildup.
   */
  cleanup(): void {
    const cutoff = new Date(
      Date.now() - OBSERVABILITY_CONFIG.ERROR_GROUPING_WINDOW_MS,
    );
    let removed = 0;
    for (const [key, value] of this.errorGroups.entries()) {
      if (value.lastSeen < cutoff) {
        this.errorGroups.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.debug(`Cleaned up ${removed} stale error fingerprints`);
    }
  }

  /**
   * Generate a fingerprint for error grouping.
   * Groups by: error message (normalized) + first stack frame + context.
   */
  private generateFingerprint(
    message: string,
    stack?: string,
    context?: string,
  ): string {
    // Normalize message: strip UUIDs, numbers, and dynamic content
    const normalizedMessage = message
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ':uuid:',
      )
      .replace(/\d+/g, ':num:');

    // Extract first meaningful stack frame (skip Error: and internal frames)
    let firstFrame = '';
    if (stack) {
      const frames = stack.split('\n').filter(
        (line) =>
          line.trim().startsWith('at ') &&
          !line.includes('node_modules') &&
          !line.includes('node:internal'),
      );
      firstFrame = frames[0]?.trim() ?? '';
    }

    const raw = `${normalizedMessage}|${firstFrame}|${context ?? ''}`;
    return createHash('sha256').update(raw).digest('hex').substring(0, 16);
  }

  /**
   * Evict the oldest error group to stay under memory limits.
   */
  private evictOldestError(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, value] of this.errorGroups.entries()) {
      if (value.lastSeen.getTime() < oldestTime) {
        oldestTime = value.lastSeen.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.errorGroups.delete(oldestKey);
    }
  }
}
