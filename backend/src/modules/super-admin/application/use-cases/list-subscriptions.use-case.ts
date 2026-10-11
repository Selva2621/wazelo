import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PlatformRepository } from '../../infrastructure/repositories/platform.repository';
import { searchTerm } from '../../domain/services/search-term';
import { listOrderBy } from '../../domain/services/list-sort';
import { buildCsvExport, CSV_EXPORT_MAX_ROWS, CsvColumn, CsvExport } from '../../domain/services/csv';

interface ListSubscriptionsInput {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  /** Whitelisted: createdAt, currentPeriodEnd, priceInCents, status */
  sort?: string;
  order?: string;
}

type SubscriptionRow = Awaited<ReturnType<PlatformRepository['findSubscriptions']>>['subscriptions'][number];

const SUBSCRIPTION_COLUMNS: CsvColumn<SubscriptionRow>[] = [
  { header: 'Subscription ID', value: (s) => s.id },
  { header: 'Organization', value: (s) => s.organization.name },
  { header: 'Organization slug', value: (s) => s.organization.slug },
  { header: 'Plan', value: (s) => s.plan.name },
  { header: 'Status', value: (s) => s.status },
  { header: 'Billing cycle', value: (s) => s.billingCycle },
  { header: 'Price (minor units)', value: (s) => s.priceInCents },
  { header: 'Currency', value: (s) => s.currency },
  { header: 'Current period start', value: (s) => s.currentPeriodStart },
  { header: 'Current period end', value: (s) => s.currentPeriodEnd },
  { header: 'Trial ends at', value: (s) => s.trialEndsAt },
  { header: 'Cancelled at', value: (s) => s.cancelledAt },
  { header: 'Cancel reason', value: (s) => s.cancelReason },
  { header: 'Created at', value: (s) => s.createdAt },
];

function statusFilter(value?: string): SubscriptionStatus | undefined {
  return (Object.values(SubscriptionStatus) as string[]).includes(value ?? '') ? (value as SubscriptionStatus) : undefined;
}

@Injectable()
export class ListSubscriptionsUseCase {
  constructor(private readonly platformRepo: PlatformRepository) {}

  async execute(input: ListSubscriptionsInput) {
    const page = Math.max(input.page ?? 1, 1);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

    const { subscriptions, total } = await this.platformRepo.findSubscriptions(
      (page - 1) * limit,
      limit,
      statusFilter(input.status),
      searchTerm(input.search),
      listOrderBy('subscriptions', input.sort, input.order),
    );
    return { subscriptions, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Same filters and sort as the list, no paging; capped at CSV_EXPORT_MAX_ROWS. */
  async exportCsv(input: ListSubscriptionsInput): Promise<CsvExport> {
    const { subscriptions } = await this.platformRepo.findSubscriptions(
      0,
      CSV_EXPORT_MAX_ROWS + 1,
      statusFilter(input.status),
      searchTerm(input.search),
      listOrderBy('subscriptions', input.sort, input.order),
    );
    return buildCsvExport('subscriptions', subscriptions, SUBSCRIPTION_COLUMNS);
  }
}
