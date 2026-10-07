import { Injectable } from '@nestjs/common';
import { InvoiceStatus, OrgStatus, PaymentStatus, Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { RevenueRow } from '../../domain/services/revenue';
import { MonthCount, MonthRevenue } from '../../domain/services/growth-series';

/** Subscription statuses that mean the org currently has a plan. */
export const LIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIAL,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.GRACE_PERIOD,
];

/** Org list filter value for orgs that never had a subscription. */
export const NO_SUBSCRIPTION_FILTER = 'NONE';

export interface OrgListQuery {
  skip: number;
  take: number;
  search?: string;
  status?: string;
}

/**
 * Cross-tenant read queries for the super admin portal. Deliberately NOT
 * scoped by orgId — only super-admin use cases may depend on this.
 */
@Injectable()
export class PlatformRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Stats ──

  countOrgs(since?: Date): Promise<number> {
    return this.prisma.organization.count({
      where: { deletedAt: null, ...(since && { createdAt: { gte: since } }) },
    });
  }

  async subscriptionStatusCounts(): Promise<Partial<Record<SubscriptionStatus, number>>> {
    const rows = await this.prisma.subscription.groupBy({ by: ['status'], _count: { status: true } });
    return Object.fromEntries(rows.map((r) => [r.status, r._count.status]));
  }

  /** Paying subscriptions — ACTIVE on a priced plan (free plans excluded) — by currency and cycle. */
  async activeRevenueRows(): Promise<RevenueRow[]> {
    const rows = await this.prisma.subscription.groupBy({
      by: ['currency', 'billingCycle'],
      where: { status: SubscriptionStatus.ACTIVE, priceInCents: { gt: 0 } },
      _sum: { priceInCents: true },
      _count: { _all: true },
    });
    return rows.map((r) => ({
      currency: r.currency,
      billingCycle: r.billingCycle,
      totalCents: r._sum.priceInCents ?? 0,
      subscriptions: r._count._all,
    }));
  }

  countChurnedSince(since: Date): Promise<number> {
    return this.prisma.subscriptionEvent.count({
      where: {
        createdAt: { gte: since },
        newStatus: { in: [SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED] },
      },
    });
  }

  countOpenTickets(): Promise<number> {
    return this.prisma.helpTicket.count({ where: { status: 'OPEN' } });
  }

  // ── Activity feed sources ──

  recentOrgs(take: number) {
    return this.prisma.organization.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, name: true, createdAt: true },
    });
  }

  recentSubscriptionEvents(take: number) {
    return this.prisma.subscriptionEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, orgId: true, previousStatus: true, newStatus: true, createdAt: true },
    });
  }

  recentTickets(take: number) {
    return this.prisma.helpTicket.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        title: true,
        createdAt: true,
        organization: { select: { id: true, name: true } },
      },
    });
  }

  async orgNames(ids: string[]): Promise<Map<string, string>> {
    if (!ids.length) return new Map();
    const orgs = await this.prisma.organization.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    return new Map(orgs.map((o) => [o.id, o.name]));
  }

  // ── Organizations ──

  /**
   * Status filter is applied in SQL (before pagination) so totals are right:
   *   live status (ACTIVE/TRIAL/…) → has a subscription in that status
   *   EXPIRED / CANCELLED           → has one in that status and no live one
   *   NONE                          → never subscribed
   */
  private orgWhere(search?: string, status?: string): Prisma.OrganizationWhereInput {
    const where: Prisma.OrganizationWhereInput = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status === NO_SUBSCRIPTION_FILTER) {
      where.subscriptions = { none: {} };
    } else if (status && (Object.values(SubscriptionStatus) as string[]).includes(status)) {
      const s = status as SubscriptionStatus;
      where.AND = LIVE_SUBSCRIPTION_STATUSES.includes(s)
        ? [{ subscriptions: { some: { status: s } } }]
        : [
            { subscriptions: { some: { status: s } } },
            { subscriptions: { none: { status: { in: LIVE_SUBSCRIPTION_STATUSES } } } },
          ];
    }
    return where;
  }

  async findOrgs(query: OrgListQuery) {
    const where = this.orgWhere(query.search, query.status);
    const [orgs, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { users: { where: { deletedAt: null } } } },
          // Live subscription first, else the most recent one
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { plan: { select: { name: true } } },
          },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);
    return { orgs, total };
  }

  findOrgDetail(orgId: string) {
    return this.prisma.organization.findFirst({
      where: { id: orgId, deletedAt: null },
      include: {
        users: {
          where: { deletedAt: null },
          select: {
            id: true, firstName: true, lastName: true,
            email: true, role: true, status: true,
            lastLoginAt: true, createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { plan: true },
        },
        usageRecords: {
          orderBy: { periodStart: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            helpTickets: true,
            contacts: { where: { deletedAt: null } },
            campaigns: { where: { deletedAt: null } },
            messages: true,
          },
        },
      },
    });
  }

  // ── Org suspension ──

  findOrgBasics(orgId: string) {
    return this.prisma.organization.findFirst({
      where: { id: orgId, deletedAt: null },
      select: { id: true, name: true, status: true, suspendedAt: true, suspendReason: true },
    });
  }

  /**
   * Suspends the org and revokes every tenant session in one transaction, so
   * no refresh token survives. Returns the number of sessions revoked.
   */
  async suspendOrg(orgId: string, reason: string): Promise<number> {
    const [, sessions] = await this.prisma.$transaction([
      this.prisma.organization.update({
        where: { id: orgId },
        data: { status: OrgStatus.SUSPENDED, suspendedAt: new Date(), suspendReason: reason },
      }),
      this.prisma.session.updateMany({
        where: { orgId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return sessions.count;
  }

  async reactivateOrg(orgId: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { status: OrgStatus.ACTIVE, suspendedAt: null, suspendReason: null },
    });
  }

  // ── Messaging health (support triage) ──

  /**
   * Sessions, channels and 7-day outbound stats for one org. Selects explicit
   * safe fields only — never credentials, configs or webhook secrets.
   */
  async findOrgMessagingHealth(orgId: string, since: Date) {
    const [sessions, channels, outboundByStatus, failureReasons] = await Promise.all([
      this.prisma.whatsAppSession.findMany({
        where: { orgId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          phoneNumber: true,
          status: true,
          lastActiveAt: true,
          lastHeartbeatAt: true,
          reconnectCount: true,
          disconnectedAt: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.channel.findMany({
        where: { orgId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          type: true,
          name: true,
          status: true,
          externalHandle: true,
          verifiedAt: true,
          suspendedAt: true,
          suspendReason: true,
          lastActiveAt: true,
          lastErrorAt: true,
          lastError: true,
        },
      }),
      this.prisma.message.groupBy({
        by: ['status'],
        where: { orgId, direction: 'OUTBOUND', createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.message.groupBy({
        by: ['failedReason'],
        where: { orgId, direction: 'OUTBOUND', status: 'FAILED', createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { failedReason: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      sessions,
      channels,
      outboundByStatus: Object.fromEntries(outboundByStatus.map((r) => [r.status, r._count._all])) as Record<string, number>,
      failureReasons: failureReasons.map((r) => ({ reason: r.failedReason ?? 'Unknown', count: r._count._all })),
    };
  }

  // ── Payments & invoices (read-only, all orgs) ──

  async findPayments(skip: number, take: number, filter: { status?: PaymentStatus; orgId?: string }) {
    const where: Prisma.PaymentWhereInput = {
      ...(filter.status && { status: filter.status }),
      ...(filter.orgId && { orgId: filter.orgId }),
    };
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: { select: { id: true, name: true } },
          invoice: { select: { id: true, invoiceNumber: true } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { payments, total };
  }

  async findInvoices(skip: number, take: number, filter: { status?: InvoiceStatus; orgId?: string }) {
    const where: Prisma.InvoiceWhereInput = {
      ...(filter.status && { status: filter.status }),
      ...(filter.orgId && { orgId: filter.orgId }),
    };
    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { organization: { select: { id: true, name: true } } },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { invoices, total };
  }

  // ── Growth time series (monthly, UTC) ──

  newOrgsByMonth(since: Date): Promise<MonthCount[]> {
    return this.prisma.$queryRaw<MonthCount[]>`
      SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, count(*)::int AS count
      FROM organizations
      WHERE deleted_at IS NULL AND created_at >= ${since}
      GROUP BY 1`;
  }

  /**
   * New paying customers: orgs counted in the month of their FIRST succeeded
   * payment. (Subscription events miss direct paid sign-ups, and free-plan
   * "ACTIVE" subscriptions aren't paying.) Older rows lack paid_at, so fall
   * back to created_at.
   */
  newPayingByMonth(since: Date): Promise<MonthCount[]> {
    return this.prisma.$queryRaw<MonthCount[]>`
      SELECT to_char(date_trunc('month', first_paid), 'YYYY-MM') AS month, count(*)::int AS count
      FROM (
        SELECT org_id, min(COALESCE(paid_at, created_at)) AS first_paid
        FROM payments
        WHERE status = 'SUCCEEDED'
        GROUP BY org_id
      ) firsts
      WHERE first_paid >= ${since}
      GROUP BY 1`;
  }

  churnedByMonth(since: Date): Promise<MonthCount[]> {
    return this.prisma.$queryRaw<MonthCount[]>`
      SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, count(*)::int AS count
      FROM subscription_events
      WHERE new_status IN ('CANCELLED', 'EXPIRED') AND created_at >= ${since}
      GROUP BY 1`;
  }

  /** Money actually collected (SUCCEEDED payments), by month paid and currency. */
  async revenueByMonth(since: Date): Promise<MonthRevenue[]> {
    const rows = await this.prisma.$queryRaw<{ month: string; currency: string; amount: bigint }[]>`
      SELECT to_char(date_trunc('month', COALESCE(paid_at, created_at)), 'YYYY-MM') AS month,
             currency, sum(amount_in_cents) AS amount
      FROM payments
      WHERE status = 'SUCCEEDED' AND COALESCE(paid_at, created_at) >= ${since}
      GROUP BY 1, 2`;
    return rows.map((r) => ({ month: r.month, currency: r.currency, amountCents: Number(r.amount) }));
  }

  // ── Subscriptions ──

  async findSubscriptions(skip: number, take: number, status?: SubscriptionStatus) {
    const where: Prisma.SubscriptionWhereInput = status ? { status } : {};
    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          plan: true,
          organization: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);
    return { subscriptions, total };
  }
}
