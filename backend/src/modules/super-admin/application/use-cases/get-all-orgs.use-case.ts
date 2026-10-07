import { Injectable } from '@nestjs/common';
import {
  PlatformRepository,
  LIVE_SUBSCRIPTION_STATUSES,
} from '../../infrastructure/repositories/platform.repository';

export interface GetAllOrgsInput {
  page?: number;
  limit?: number;
  search?: string;
  /** A SubscriptionStatus, or 'NONE' for orgs that never subscribed */
  status?: string;
}

@Injectable()
export class GetAllOrgsUseCase {
  constructor(private readonly platformRepo: PlatformRepository) {}

  async execute(input: GetAllOrgsInput) {
    const page = Math.max(input.page ?? 1, 1);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

    const { orgs, total } = await this.platformRepo.findOrgs({
      skip: (page - 1) * limit,
      take: limit,
      search: input.search,
      status: input.status,
    });

    return {
      orgs: orgs.map((o) => {
        // Current subscription: a live one if any, else the most recent
        const sub =
          o.subscriptions.find((s) => LIVE_SUBSCRIPTION_STATUSES.includes(s.status)) ?? o.subscriptions[0];
        return {
          id: o.id,
          name: o.name,
          slug: o.slug,
          orgType: o.orgType,
          status: o.status,
          createdAt: o.createdAt,
          userCount: o._count.users,
          subscription: sub
            ? {
                status: sub.status,
                planName: sub.plan?.name ?? null,
                billingCycle: sub.billingCycle,
                currentPeriodEnd: sub.currentPeriodEnd,
                priceInCents: sub.priceInCents,
                currency: sub.currency,
              }
            : null,
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
