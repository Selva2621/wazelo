import { Injectable } from '@nestjs/common';
import { PlatformRepository } from '../../infrastructure/repositories/platform.repository';
import { computeRevenue } from '../../domain/services/revenue';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class GetPlatformStatsUseCase {
  constructor(private readonly platformRepo: PlatformRepository) {}

  async execute() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS);

    const [totalOrgs, statusCounts, revenueRows, newOrgsLast30Days, churnedLast30Days, openTickets] =
      await Promise.all([
        this.platformRepo.countOrgs(),
        this.platformRepo.subscriptionStatusCounts(),
        this.platformRepo.activeRevenueRows(),
        this.platformRepo.countOrgs(thirtyDaysAgo),
        this.platformRepo.countChurnedSince(thirtyDaysAgo),
        this.platformRepo.countOpenTickets(),
      ]);

    return {
      totalOrgs,
      activeSubscriptions: statusCounts.ACTIVE ?? 0,
      trialSubscriptions: statusCounts.TRIAL ?? 0,
      pastDueSubscriptions: (statusCounts.PAST_DUE ?? 0) + (statusCounts.GRACE_PERIOD ?? 0),
      expiredSubscriptions: (statusCounts.EXPIRED ?? 0) + (statusCounts.CANCELLED ?? 0),
      /** One entry per currency, largest MRR first — never summed across currencies */
      revenue: computeRevenue(revenueRows),
      newOrgsLast30Days,
      churnedLast30Days,
      openTickets,
    };
  }
}
