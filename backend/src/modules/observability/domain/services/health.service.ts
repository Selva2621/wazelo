import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { AppWebSocketGateway } from '@/infrastructure/websocket/websocket.gateway';
import { QUEUE_NAMES, OBSERVABILITY_CONFIG, METRIC_NAMES } from '@/common/constants';
import { MetricsService } from './metrics.service';
import { ErrorTrackingService } from './error-tracking.service';

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  components: {
    database: ComponentHealth;
    queue: ComponentHealth;
    websocket: ComponentHealth;
  };
  metrics: {
    activeWebSocketConnections: number;
    queueDepths: Record<string, number>;
    errorRate: number;
    recentErrors: number;
  };
}

export interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  details?: Record<string, unknown>;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly wsGateway: AppWebSocketGateway,
    private readonly metricsService: MetricsService,
    private readonly errorTrackingService: ErrorTrackingService,
  ) {}

  /**
   * Get comprehensive system health status.
   * AC1: Dashboard loads ≤2s.
   */
  async getHealth(): Promise<SystemHealth> {
    const [dbHealth, queueHealth, wsHealth, queueDepths] = await Promise.all([
      this.checkDatabase(),
      this.checkQueue(),
      this.checkWebSocket(),
      this.getQueueDepths(),
    ]);

    const recentErrors = this.errorTrackingService.getRecentErrors(5);
    const totalErrors = recentErrors.reduce((sum, e) => sum + e.count, 0);

    const overallStatus = this.determineOverallStatus(
      dbHealth,
      queueHealth,
      wsHealth,
      totalErrors,
      queueDepths,
    );

    const health: SystemHealth = {
      status: overallStatus,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      components: {
        database: dbHealth,
        queue: queueHealth,
        websocket: wsHealth,
      },
      metrics: {
        activeWebSocketConnections: this.getActiveWsConnections(),
        queueDepths,
        errorRate: totalErrors,
        recentErrors: recentErrors.length,
      },
    };

    // Record health metrics for trending
    this.metricsService.record(METRIC_NAMES.ACTIVE_WEBSOCKET_CONNECTIONS, health.metrics.activeWebSocketConnections);
    for (const [queue, depth] of Object.entries(queueDepths)) {
      this.metricsService.recordQueueMetric(queue, 'depth', depth);
    }

    return health;
  }

  /**
   * Get detailed queue status for each queue.
   */
  async getQueueStatus(): Promise<Record<string, { depth: number; status: string }>> {
    const depths = await this.getQueueDepths();
    const result: Record<string, { depth: number; status: string }> = {};

    for (const [name, depth] of Object.entries(depths)) {
      let status = 'healthy';
      if (depth >= OBSERVABILITY_CONFIG.QUEUE_DEPTH_CRITICAL) {
        status = 'critical';
      } else if (depth >= OBSERVABILITY_CONFIG.QUEUE_DEPTH_WARNING) {
        status = 'warning';
      }
      result[name] = { depth, status };
    }

    return result;
  }

  private async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        latency: Date.now() - start,
      };
    } catch (error) {
      this.logger.error(
        'Database health check failed',
        error instanceof Error ? error.stack : String(error),
      );
      return {
        status: 'down',
        latency: Date.now() - start,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  private async checkQueue(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      // Test by checking queue size for a known queue
      await this.queueService.getQueueSize(QUEUE_NAMES.SEND_EMAIL);
      return {
        status: 'up',
        latency: Date.now() - start,
      };
    } catch (error) {
      this.logger.error(
        'Queue health check failed',
        error instanceof Error ? error.stack : String(error),
      );
      return {
        status: 'down',
        latency: Date.now() - start,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  private checkWebSocket(): ComponentHealth {
    try {
      const connections = this.getActiveWsConnections();
      return {
        status: 'up',
        details: { activeConnections: connections },
      };
    } catch {
      return { status: 'down' };
    }
  }

  private getActiveWsConnections(): number {
    try {
      // Access the server property to count connected sockets
      return this.wsGateway.server?.sockets?.sockets?.size ?? 0;
    } catch {
      return 0;
    }
  }

  private async getQueueDepths(): Promise<Record<string, number>> {
    const depths: Record<string, number> = {};
    const queueNames = Object.values(QUEUE_NAMES);

    const results = await Promise.allSettled(
      queueNames.map(async (name) => ({
        name,
        size: await this.queueService.getQueueSize(name),
      })),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        depths[result.value.name] = result.value.size;
      }
    }

    return depths;
  }

  private determineOverallStatus(
    db: ComponentHealth,
    queue: ComponentHealth,
    ws: ComponentHealth,
    errorCount: number,
    queueDepths: Record<string, number>,
  ): 'healthy' | 'degraded' | 'unhealthy' {
    // Database down = unhealthy
    if (db.status === 'down') return 'unhealthy';

    // Queue down = unhealthy
    if (queue.status === 'down') return 'unhealthy';

    // High queue depth = degraded
    const maxDepth = Math.max(...Object.values(queueDepths), 0);
    if (maxDepth >= OBSERVABILITY_CONFIG.QUEUE_DEPTH_CRITICAL) return 'degraded';

    // High error rate = degraded
    if (errorCount > 50) return 'degraded';

    // WebSocket down = degraded (not critical)
    if (ws.status === 'down') return 'degraded';

    return 'healthy';
  }
}
