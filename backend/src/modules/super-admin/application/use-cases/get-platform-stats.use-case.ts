import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class GetPlatformStatsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalOrgs,
      subscriptionCounts,
      mrrResult,
      newOrgsLast30Days,
      openTickets,
    ] = await Promise.all([
      this.prisma.organization.count({ where: { deletedAt: null } }),

      this.prisma.subscription.groupBy({
        by: ['status'],
        _count: { status: true },
      }),

      this.prisma.subscription.aggregate({
        where: { status: 'ACTIVE', billingCycle: 'MONTHLY' },
        _sum: { priceInCents: true },
      }),

      this.prisma.organization.count({
        where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } },
      }),

      this.prisma.helpTicket.count({ where: { status: 'OPEN' } }),
    ]);

    const statusMap = Object.fromEntries(
      subscriptionCounts.map((r) => [r.status, r._count.status]),
    );

    return {
      totalOrgs,
      activeSubscriptions: statusMap['ACTIVE'] ?? 0,
      trialSubscriptions: statusMap['TRIAL'] ?? 0,
      expiredSubscriptions: (statusMap['EXPIRED'] ?? 0) + (statusMap['CANCELLED'] ?? 0),
      pastDueSubscriptions: statusMap['PAST_DUE'] ?? 0,
      mrr: mrrResult._sum.priceInCents ?? 0,
      newOrgsLast30Days,
      openTickets,
    };
  }
}
