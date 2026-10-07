import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PlatformRepository,
  LIVE_SUBSCRIPTION_STATUSES,
} from '../../infrastructure/repositories/platform.repository';

@Injectable()
export class GetOrgDetailUseCase {
  constructor(private readonly platformRepo: PlatformRepository) {}

  async execute(orgId: string) {
    const org = await this.platformRepo.findOrgDetail(orgId);
    if (!org) throw new NotFoundException('Organization not found');

    const subscription =
      org.subscriptions.find((s) => LIVE_SUBSCRIPTION_STATUSES.includes(s.status)) ??
      org.subscriptions[0] ??
      null;

    // Usage for the current billing period only, so it can be compared to plan limits
    const currentUsage = subscription
      ? org.usageRecords.filter(
          (u) => u.periodStart.getTime() >= subscription.currentPeriodStart.getTime() - 1000,
        )
      : [];

    return {
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        orgType: org.orgType,
        timezone: org.timezone,
        status: org.status,
        suspendedAt: org.suspendedAt,
        suspendReason: org.suspendReason,
        createdAt: org.createdAt,
      },
      users: org.users,
      subscription,
      subscriptionHistory: org.subscriptions,
      usageRecords: currentUsage,
      counts: org._count,
    };
  }
}
