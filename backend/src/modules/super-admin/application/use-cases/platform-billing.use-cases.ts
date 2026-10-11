import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { buildDailyUsage, usageWindowStart } from '../../domain/services/usage-series';
import { searchTerm } from '../../domain/services/search-term';
import { listOrderBy } from '../../domain/services/list-sort';
import { buildCsvExport, CSV_EXPORT_MAX_ROWS, CsvColumn, CsvExport } from '../../domain/services/csv';
import { InvoiceStatus, PaymentStatus, PlatformAuditAction } from '@prisma/client';
import { checkRefund } from '../../domain/services/refunds';
import { AuditActor, PlatformAuditService, RequestMeta } from '../services/platform-audit.service';
import { PlatformRepository } from '../../infrastructure/repositories/platform.repository';
import { buildGrowthSeries, lastMonths, windowStart } from '../../domain/services/growth-series';

interface ListInput {
  page?: number;
  limit?: number;
  status?: string;
  orgId?: string;
  search?: string;
  /** Whitelisted per list (see domain/services/list-sort); anything else means newest first */
  sort?: string;
  order?: string;
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

function paymentFilter(input: ListInput) {
  return {
    status: enumValue(PaymentStatus, input.status),
    orgId: orgFilter(input.orgId),
    search: searchTerm(input.search),
  };
}

function invoiceFilter(input: ListInput) {
  return {
    status: enumValue(InvoiceStatus, input.status),
    orgId: orgFilter(input.orgId),
    search: searchTerm(input.search),
  };
}

type PaymentRow = Awaited<ReturnType<PlatformRepository['findPayments']>>['payments'][number];
type InvoiceRow = Awaited<ReturnType<PlatformRepository['findInvoices']>>['invoices'][number];

/** Org name, marked when the org has since been deleted. */
function orgName(org: { name: string; deletedAt: Date | null }): string {
  return org.deletedAt ? `${org.name} (deleted)` : org.name;
}

const PAYMENT_COLUMNS: CsvColumn<PaymentRow>[] = [
  { header: 'Payment ID', value: (p) => p.id },
  { header: 'Organization', value: (p) => orgName(p.organization) },
  { header: 'Invoice number', value: (p) => p.invoice?.invoiceNumber },
  { header: 'Status', value: (p) => p.status },
  { header: 'Amount (minor units)', value: (p) => p.amountInCents },
  { header: 'Refunded (minor units)', value: (p) => p.refunds.reduce((sum, r) => sum + r.amountInCents, 0) },
  { header: 'Currency', value: (p) => p.currency },
  { header: 'Payment method', value: (p) => p.paymentMethod },
  { header: 'Gateway reference', value: (p) => p.externalId },
  { header: 'Failure reason', value: (p) => p.failedReason },
  { header: 'Paid at', value: (p) => p.paidAt },
  { header: 'Created at', value: (p) => p.createdAt },
];

const INVOICE_COLUMNS: CsvColumn<InvoiceRow>[] = [
  { header: 'Invoice ID', value: (i) => i.id },
  { header: 'Invoice number', value: (i) => i.invoiceNumber },
  { header: 'Organization', value: (i) => orgName(i.organization) },
  { header: 'Status', value: (i) => i.status },
  { header: 'Amount (minor units)', value: (i) => i.amountInCents },
  { header: 'Currency', value: (i) => i.currency },
  { header: 'Period start', value: (i) => i.periodStart },
  { header: 'Period end', value: (i) => i.periodEnd },
  { header: 'Due date', value: (i) => i.dueDate },
  { header: 'Paid at', value: (i) => i.paidAt },
  { header: 'Created at', value: (i) => i.createdAt },
];

/** Read-only payments across all orgs. */
@Injectable()
export class ListPlatformPaymentsUseCase {
  constructor(private readonly platformRepo: PlatformRepository) {}

  async execute(input: ListInput) {
    const { page, limit, skip } = paging(input);
    const { payments, total } = await this.platformRepo.findPayments(
      skip,
      limit,
      paymentFilter(input),
      listOrderBy('payments', input.sort, input.order),
    );
    return { payments, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Same filters and sort as the list, no paging; capped at CSV_EXPORT_MAX_ROWS. */
  async exportCsv(input: ListInput): Promise<CsvExport> {
    const { payments } = await this.platformRepo.findPayments(
      0,
      CSV_EXPORT_MAX_ROWS + 1,
      paymentFilter(input),
      listOrderBy('payments', input.sort, input.order),
    );
    return buildCsvExport('payments', payments, PAYMENT_COLUMNS);
  }
}

/** Read-only invoices across all orgs. */
@Injectable()
export class ListPlatformInvoicesUseCase {
  constructor(private readonly platformRepo: PlatformRepository) {}

  async execute(input: ListInput) {
    const { page, limit, skip } = paging(input);
    const { invoices, total } = await this.platformRepo.findInvoices(
      skip,
      limit,
      invoiceFilter(input),
      listOrderBy('invoices', input.sort, input.order),
    );
    return { invoices, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Same filters and sort as the list, no paging; capped at CSV_EXPORT_MAX_ROWS. */
  async exportCsv(input: ListInput): Promise<CsvExport> {
    const { invoices } = await this.platformRepo.findInvoices(
      0,
      CSV_EXPORT_MAX_ROWS + 1,
      invoiceFilter(input),
      listOrderBy('invoices', input.sort, input.order),
    );
    return buildCsvExport('invoices', invoices, INVOICE_COLUMNS);
  }
}

/**
 * Records a refund that was already made in the gateway dashboard. Nothing here moves
 * money; it keeps our records (and revenue) honest. Audited.
 */
@Injectable()
export class RecordPaymentRefundUseCase {
  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(
    paymentId: string,
    input: { amountInCents: number; reason: string; externalRefundId?: string },
    actor: AuditActor,
    meta: RequestMeta,
  ) {
    const result = await this.platformRepo.recordRefund(
      paymentId,
      { ...input, createdById: actor.id },
      (payment, refunded) => {
        const check = checkRefund(payment.status, payment.amountInCents, refunded, input.amountInCents);
        if (!check.ok) throw new BadRequestException(check.reason);
        return check;
      },
    );
    if (!result) throw new NotFoundException('Payment not found');

    await this.audit.record({
      action: PlatformAuditAction.PAYMENT_REFUND_RECORDED,
      actor,
      targetType: 'Payment',
      targetId: paymentId,
      orgId: result.payment.orgId,
      metadata: {
        amountInCents: input.amountInCents,
        currency: result.payment.currency,
        reason: input.reason,
        externalRefundId: input.externalRefundId ?? null,
        refundedBefore: result.refundedBefore,
        fullyRefunded: result.fullyRefunded,
      },
      meta,
    });
    return { refund: result.refund, fullyRefunded: result.fullyRefunded };
  }
}

/** Platform message volume per day plus the busiest orgs, over the last N days (UTC). */
@Injectable()
export class GetPlatformUsageUseCase {
  constructor(private readonly platformRepo: PlatformRepository) {}

  async execute(days = 30) {
    const span = Math.min(Math.max(Math.trunc(days) || 30, 1), 90);
    const since = usageWindowStart(span);
    const [rows, topOrgs] = await Promise.all([
      this.platformRepo.messagesByDay(since),
      this.platformRepo.topOrgsByOutbound(since, 10),
    ]);
    const daily = buildDailyUsage(rows, span);
    const totals = daily.reduce(
      (t, d) => ({ outbound: t.outbound + d.outbound, inbound: t.inbound + d.inbound, failed: t.failed + d.failed }),
      { outbound: 0, inbound: 0, failed: 0 },
    );
    return { days: span, daily, totals, topOrgs };
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
