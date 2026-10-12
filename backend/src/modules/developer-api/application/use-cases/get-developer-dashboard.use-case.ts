import { Injectable } from '@nestjs/common';
import { UsageMetricType } from '@prisma/client';
import { UsageTrackingService } from '@/modules/billing/domain/services/usage-tracking.service';
import { DeveloperApiRepository } from '../../infrastructure/repositories/developer-api.repository';

/** Stats for Settings → API Keys & Docs → Overview, including this period's message usage. */
@Injectable()
export class GetDeveloperDashboardUseCase {
  constructor(
    private readonly repo: DeveloperApiRepository,
    private readonly usageTracking: UsageTrackingService,
  ) {}

  async execute(orgId: string) {
    const [stats, usage] = await Promise.all([
      this.repo.getDashboardStats(orgId),
      this.usageTracking.checkUsage(orgId, UsageMetricType.MESSAGES_SENT),
    ]);

    return {
      ...stats,
      messagesUsed: usage.currentValue,
      // A limit of 0 means the plan has no cap
      messagesLimit: usage.limitValue > 0 ? usage.limitValue : null,
    };
  }
}
