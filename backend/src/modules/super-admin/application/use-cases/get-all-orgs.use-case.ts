import { Injectable } from '@nestjs/common';
import {
  PlatformRepository,
  LIVE_SUBSCRIPTION_STATUSES,
} from '../../infrastructure/repositories/platform.repository';
import { listOrderBy } from '../../domain/services/list-sort';
import { buildCsvExport, CSV_EXPORT_MAX_ROWS, CsvColumn, CsvExport } from '../../domain/services/csv';
import { searchTerm } from '../../domain/services/search-term';

export interface GetAllOrgsInput {
  page?: number;
  limit?: number;
  search?: string;
  /** A SubscriptionStatus, or 'NONE' for orgs that never subscribed */
  status?: string;
  /** Whitelisted: name, createdAt. Anything else means newest first. */
  sort?: string;
  order?: string;
}

type OrgRecord = Awaited<ReturnType<PlatformRepository['findOrgs']>>['orgs'][number];

function toOrgRow(o: OrgRecord) {
  // Current subscription: a live one if any, else the most recent
  const sub = o.subscriptions.find((s) => LIVE_SUBSCRIPTION_STATUSES.includes(s.status)) ?? o.subscriptions[0];
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
}

type OrgRow = ReturnType<typeof toOrgRow>;

const ORG_COLUMNS: CsvColumn<OrgRow>[] = [
  { header: 'Organization ID', value: (r) => r.id },
  { header: 'Name', value: (r) => r.name },
  { header: 'Slug', value: (r) => r.slug },
  { header: 'Type', value: (r) => r.orgType },
  { header: 'Org status', value: (r) => r.status },
  { header: 'Users', value: (r) => r.userCount },
  { header: 'Plan', value: (r) => r.subscription?.planName },
  { header: 'Subscription status', value: (r) => r.subscription?.status ?? 'NONE' },
  { header: 'Billing cycle', value: (r) => r.subscription?.billingCycle },
  { header: 'Price (minor units)', value: (r) => r.subscription?.priceInCents },
  { header: 'Currency', value: (r) => r.subscription?.currency },
  { header: 'Current period end', value: (r) => r.subscription?.currentPeriodEnd },
  { header: 'Created at', value: (r) => r.createdAt },
];

@Injectable()
export class GetAllOrgsUseCase {
  constructor(private readonly platformRepo: PlatformRepository) {}

  async execute(input: GetAllOrgsInput) {
    const page = Math.max(input.page ?? 1, 1);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

    const { orgs, total } = await this.platformRepo.findOrgs({
      skip: (page - 1) * limit,
      take: limit,
      search: searchTerm(input.search),
      status: input.status,
      orderBy: listOrderBy('organizations', input.sort, input.order),
    });

    return {
      orgs: orgs.map(toOrgRow),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Same filters and sort as the list, no paging; capped at CSV_EXPORT_MAX_ROWS. */
  async exportCsv(input: GetAllOrgsInput): Promise<CsvExport> {
    const { orgs } = await this.platformRepo.findOrgs({
      skip: 0,
      take: CSV_EXPORT_MAX_ROWS + 1,
      search: searchTerm(input.search),
      status: input.status,
      orderBy: listOrderBy('organizations', input.sort, input.order),
    });
    return buildCsvExport('organizations', orgs.map(toOrgRow), ORG_COLUMNS);
  }
}
