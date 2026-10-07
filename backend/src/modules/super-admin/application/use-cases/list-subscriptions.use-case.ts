import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PlatformRepository } from '../../infrastructure/repositories/platform.repository';

@Injectable()
export class ListSubscriptionsUseCase {
  constructor(private readonly platformRepo: PlatformRepository) {}

  async execute(input: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(input.page ?? 1, 1);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
    const status = (Object.values(SubscriptionStatus) as string[]).includes(input.status ?? '')
      ? (input.status as SubscriptionStatus)
      : undefined;

    const { subscriptions, total } = await this.platformRepo.findSubscriptions(
      (page - 1) * limit,
      limit,
      status,
    );
    return { subscriptions, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
