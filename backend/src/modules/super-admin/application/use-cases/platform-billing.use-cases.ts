import { Injectable } from '@nestjs/common';
import { InvoiceStatus, PaymentStatus } from '@prisma/client';
import { PlatformRepository } from '../../infrastructure/repositories/platform.repository';
import { buildGrowthSeries, lastMonths, windowStart } from '../../domain/services/growth-series';

interface ListInput {
  page?: number;
  limit?: number;
  status?: string;
  orgId?: string;
}

function paging(input: ListInput) {
  const page = Math.max(input.page ?? 1, 1);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

function enumValue<T extends string>(values: Record<string, T>, value?: string): T | undefined {
  return value && (Object.values(values) as string[]).includes(value) ? (value as T) : undefined;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ignore a malformed orgId rather than letting the uuid column throw. */
function orgFilter(orgId?: string): string | undefined {
  return orgId && UUID.test(orgId) ? orgId : undefined;
}

/** Read-only payments across all orgs. */
@Injectable()
export class ListPlatformPaymentsUseCase {
  constructor(private readonly platformRepo: PlatformRepository) {}

  async execute(input: ListInput) {
    const { page, limit, skip } = paging(input);
    const { payments, total } = await this.platformRepo.findPayments(skip, limit, {
      status: enumValue(PaymentStatus, input.status),
      orgId: orgFilter(input.orgId),
    });
    return { payments, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

/** Read-only invoices across all orgs. */
@Injectable()
export class ListPlatformInvoicesUseCase {
  constructor(private readonly platformRepo: PlatformRepository) {}

  async execute(input: ListInput) {
    const { page, limit, skip } = paging(input);
    const { invoices, total } = await this.platformRepo.findInvoices(skip, limit, {
      status: enumValue(InvoiceStatus, input.status),
      orgId: orgFilter(input.orgId),
    });
    return { invoices, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

/** Monthly signups, new paying customers, churn and collected revenue for the last N months. */
@Injectable()
export class GetPlatformGrowthUseCase {
  constructor(private readonly platformRepo: PlatformRepository) {}

  async execute(months = 12) {
    const span = Math.min(Math.max(months, 1), 24);
    const since = windowStart(span);
    const [newOrgs, newPaying, churned, revenue] = await Promise.all([
      this.platformRepo.newOrgsByMonth(since),
      this.platformRepo.newPayingByMonth(since),
      this.platformRepo.churnedByMonth(since),
      this.platformRepo.revenueByMonth(since),
    ]);
    return { months: buildGrowthSeries(lastMonths(span), { newOrgs, newPaying, churned, revenue }) };
  }
}
