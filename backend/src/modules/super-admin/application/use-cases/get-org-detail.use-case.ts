import { Injectable, NotFoundException } from '@nestjs/common';
import { EntitlementOverrideService } from '@/modules/billing/domain/services/entitlement-override.service';
import { effectiveLimit } from '@/modules/billing/domain/services/entitlements';
import {
  PlatformRepository,
  LIVE_SUBSCRIPTION_STATUSES,
} from '../../infrastructure/repositories/platform.repository';

@Injectable()
export class GetOrgDetailUseCase {
  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly overrides: EntitlementOverrideService,
  ) {}

  async execute(orgId: string) {
    const org = await this.platformRepo.findOrgDetail(orgId);
    if (!org) throw new NotFoundException('Organization not found');

    const subscription =
      org.subscriptions.find((s) => LIVE_SUBSCRIPTION_STATUSES.includes(s.status)) ??
      org.subscriptions[0] ??
      null;

    // Usage for the current billing period only, compared to the effective limit
    // (a super admin override wins over the limit snapshotted from the plan)
    const overrides = await this.overrides.forOrg(orgId);
    const currentUsage = subscription
      ? org.usageRecords
          .filter((u) => u.periodStart.getTime() >= subscription.currentPeriodStart.getTime() - 1000)
          .map((u) => {
            const eff = effectiveLimit(u.limitValue, overrides, u.metricType);
            return { ...u, limitValue: eff.value, limitOverridden: eff.overridden };
          })
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
