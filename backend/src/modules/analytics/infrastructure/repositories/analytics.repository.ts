import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Message Daily ────────────────────────────

  async getMessageDailySeries(
    orgId: string,
    startDate: Date,
    endDate: Date,
    userIds?: string[],
  ) {
    return this.prisma.analyticsMessageDaily.findMany({
      where: {
        orgId,
        date: { gte: startDate, lte: endDate },
        ...(userIds ? { userId: { in: userIds } } : {}),
      },
      orderBy: { date: 'asc' },
    });
  }

  // ─── Message Hourly ───────────────────────────

  async getMessageHourlySeries(
    orgId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.analyticsMessageHourly.findMany({
      where: {
        orgId,
        hour: { gte: startDate, lte: endDate },
      },
      orderBy: { hour: 'asc' },
    });
  }

  // ─── Response Time ────────────────────────────

  async getResponseTimeSeries(
    orgId: string,
    startDate: Date,
    endDate: Date,
    userIds?: string[],
  ) {
    return this.prisma.analyticsResponseTime.findMany({
      where: {
        orgId,
        date: { gte: startDate, lte: endDate },
        ...(userIds ? { userId: { in: userIds } } : {}),
      },
      orderBy: { date: 'asc' },
    });
  }

  // ─── Conversion Daily ─────────────────────────

  async getConversionDailySeries(
    orgId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.analyticsConversionDaily.findMany({
      where: {
        orgId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });
  }

  // ─── Campaign Summary ─────────────────────────

  async getCampaignSummarySeries(
    orgId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.analyticsCampaignSummary.findMany({
      where: {
        orgId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });
  }

  // ─── Live Queries (not pre-aggregated) ────────

  async getCurrentLeadStatusCounts(
    orgId: string,
  ): Promise<{ leadStatus: string; count: number }[]> {
    const results = await this.prisma.contact.groupBy({
      by: ['leadStatus'],
      where: { orgId, deletedAt: null, mergedIntoId: null },
      _count: { id: true },
    });
    return results.map((r) => ({
      leadStatus: r.leadStatus,
      count: r._count.id,
    }));
  }

  async getContactsConvertedByUser(
    orgId: string,
    startDate: Date,
    endDate: Date,
    userIds?: string[],
  ): Promise<{ changedById: string; count: number }[]> {
    const results = await this.prisma.contactStatusHistory.groupBy({
      by: ['changedById'],
      where: {
        orgId,
        newStatus: 'CONVERTED',
        createdAt: { gte: startDate, lte: endDate },
        ...(userIds ? { changedById: { in: userIds } } : {}),
      },
      _count: { id: true },
    });
    return results.map((r) => ({
      changedById: r.changedById,
      count: r._count.id,
    }));
  }

  async getActiveConversationsByUser(
    orgId: string,
    userIds?: string[],
  ): Promise<{ assignedToId: string; count: number }[]> {
    const results = await this.prisma.conversation.groupBy({
      by: ['assignedToId'],
      where: {
        orgId,
        status: 'OPEN',
        deletedAt: null,
        assignedToId: { not: null, ...(userIds ? { in: userIds } : {}) },
      },
      _count: { id: true },
    });
    return results.map((r) => ({
      assignedToId: r.assignedToId!,
      count: r._count.id,
    }));
  }

  async getUsersByIds(
    orgId: string,
    userIds?: string[],
  ): Promise<{ id: string; firstName: string; lastName: string }[]> {
    return this.prisma.user.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(userIds ? { id: { in: userIds } } : {}),
      },
      select: { id: true, firstName: true, lastName: true },
    });
  }
}
