import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { UsageRecord, UsageMetricType } from '@prisma/client';

@Injectable()
export class UsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(
    orgId: string,
    metricType: UsageMetricType,
    periodStart: Date,
    periodEnd: Date,
    limitValue: number,
  ): Promise<UsageRecord> {
    // Upsert to handle concurrent creation
    return this.prisma.usageRecord.upsert({
      where: {
        unique_usage_per_org_metric_period: {
          orgId,
          metricType,
          periodStart,
        },
      },
      update: {},
      create: {
        orgId,
        metricType,
        periodStart,
        periodEnd,
        currentValue: 0,
        limitValue,
      },
    });
  }

  async incrementUsage(
    orgId: string,
    metricType: UsageMetricType,
    periodStart: Date,
    amount: number = 1,
  ): Promise<UsageRecord> {
    return this.prisma.usageRecord.update({
      where: {
        unique_usage_per_org_metric_period: {
          orgId,
          metricType,
          periodStart,
        },
      },
      data: {
        currentValue: { increment: amount },
        lastIncrementAt: new Date(),
      },
    });
  }

  async getUsage(
    orgId: string,
    metricType: UsageMetricType,
    periodStart: Date,
  ): Promise<UsageRecord | null> {
    return this.prisma.usageRecord.findUnique({
      where: {
        unique_usage_per_org_metric_period: {
          orgId,
          metricType,
          periodStart,
        },
      },
    });
  }

  async getAllUsageForPeriod(
    orgId: string,
    periodStart: Date,
  ): Promise<UsageRecord[]> {
    return this.prisma.usageRecord.findMany({
      where: { orgId, periodStart },
    });
  }

  async resetUsageForOrg(
    orgId: string,
    newPeriodStart: Date,
    newPeriodEnd: Date,
    limits: Record<UsageMetricType, number>,
  ): Promise<void> {
    const metricTypes = Object.values(UsageMetricType);

    // Create new usage records for the new period
    await this.prisma.$transaction(
      metricTypes.map((metricType) =>
        this.prisma.usageRecord.upsert({
          where: {
            unique_usage_per_org_metric_period: {
              orgId,
              metricType,
              periodStart: newPeriodStart,
            },
          },
          update: {
            limitValue: limits[metricType] ?? 0,
            periodEnd: newPeriodEnd,
          },
          create: {
            orgId,
            metricType,
            periodStart: newPeriodStart,
            periodEnd: newPeriodEnd,
            currentValue: 0,
            limitValue: limits[metricType] ?? 0,
          },
        }),
      ),
    );
  }

  /**
   * Get real-time active user count for an org (not from usage counters).
   * Counts users with ACTIVE status and not soft-deleted.
   */
  async getActiveUserCount(orgId: string): Promise<number> {
    return this.prisma.user.count({
      where: { orgId, status: 'ACTIVE', deletedAt: null },
    });
  }

  /**
   * Get active WhatsApp session count for an org.
   */
  async getActiveSessionCount(orgId: string): Promise<number> {
    return this.prisma.whatsAppSession.count({
      where: {
        orgId,
        status: { in: ['CONNECTED', 'CONNECTING', 'RECONNECTING'] },
        deletedAt: null,
      },
    });
  }

  /**
   * Get total message template count for an org (live count).
   */
  async getTemplateCount(orgId: string): Promise<number> {
    return this.prisma.messageTemplate.count({
      where: { orgId, deletedAt: null },
    });
  }
}
