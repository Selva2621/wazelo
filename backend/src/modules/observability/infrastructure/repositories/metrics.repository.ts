import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateMetricInput {
  orgId?: string;
  metric: string;
  value: number;
  tags?: Record<string, unknown>;
}

export interface MetricAggregation {
  metric: string;
  avg: number;
  min: number;
  max: number;
  count: number;
  p95?: number;
}

@Injectable()
export class MetricsRepository {
  private readonly logger = new Logger(MetricsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async createMany(data: CreateMetricInput[]): Promise<number> {
    const result = await this.prisma.systemMetricSnapshot.createMany({
      data: data.map((d) => ({
        orgId: d.orgId,
        metric: d.metric,
        value: d.value,
        tags: (d.tags as Prisma.InputJsonValue) ?? undefined,
      })),
    });
    return result.count;
  }

  /**
   * Get aggregated metrics for a given metric name and time range.
   */
  async getAggregated(
    metric: string,
    startDate: Date,
    endDate: Date,
    orgId?: string,
  ): Promise<MetricAggregation> {
    const where: Prisma.SystemMetricSnapshotWhereInput = {
      metric,
      createdAt: { gte: startDate, lte: endDate },
      ...(orgId ? { orgId } : {}),
    };

    const agg = await this.prisma.systemMetricSnapshot.aggregate({
      where,
      _avg: { value: true },
      _min: { value: true },
      _max: { value: true },
      _count: { id: true },
    });

    return {
      metric,
      avg: agg._avg.value ?? 0,
      min: agg._min.value ?? 0,
      max: agg._max.value ?? 0,
      count: agg._count.id,
    };
  }

  /**
   * Get time-series data for a metric within a time range.
   * Returns raw data points (for graphing on the dashboard).
   */
  async getTimeSeries(
    metric: string,
    startDate: Date,
    endDate: Date,
    orgId?: string,
    limit: number = 500,
  ) {
    return this.prisma.systemMetricSnapshot.findMany({
      where: {
        metric,
        createdAt: { gte: startDate, lte: endDate },
        ...(orgId ? { orgId } : {}),
      },
      select: {
        value: true,
        tags: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Get the latest value for each tracked metric.
   */
  async getLatestMetrics(orgId?: string): Promise<{ metric: string; value: number; createdAt: Date }[]> {
    // Use raw query for efficient "latest per group" pattern
    const orgFilter = orgId
      ? Prisma.sql`AND org_id = ${orgId}::uuid`
      : Prisma.empty;

    const results = await this.prisma.$queryRaw<
      { metric: string; value: number; created_at: Date }[]
    >`
      SELECT DISTINCT ON (metric)
        metric, value, created_at
      FROM system_metric_snapshots
      WHERE created_at > NOW() - INTERVAL '5 minutes'
      ${orgFilter}
      ORDER BY metric, created_at DESC
    `;

    return results.map((r) => ({
      metric: r.metric,
      value: r.value,
      createdAt: r.created_at,
    }));
  }

  /**
   * Delete metrics older than retention period.
   */
  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.prisma.systemMetricSnapshot.deleteMany({
      where: { createdAt: { lt: date } },
    });
    return result.count;
  }
}
