import { Injectable } from '@nestjs/common';
import { InvoiceStatus, OrgStatus, OrgType, PaymentStatus, Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { RevenueRow } from '../../domain/services/revenue';
import { MonthCount, MonthRevenue } from '../../domain/services/growth-series';
import { DayDirectionRow } from '../../domain/services/usage-series';
import { OrderByEntry } from '../../domain/services/list-sort';

/** Newest first — every list's ordering when none is given. */
const NEWEST_FIRST: OrderByEntry[] = [{ createdAt: 'desc' }, { id: 'desc' }];

/** Subscription statuses that mean the org currently has a plan. */
export const LIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIAL,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.GRACE_PERIOD,
];

/**
 * Soft-deleted orgs are left out of everything operational (lists, counts, MRR, activity).
 * Money history — payments, invoices, collected revenue, churn — keeps them, flagged, so
 * past totals never change when an org is deleted.
 */
const LIVE_ORG: Prisma.OrganizationWhereInput = { deletedAt: null };

/** Org list filter value for orgs that never had a subscription. */
export const NO_SUBSCRIPTION_FILTER = 'NONE';

/** Org list filter value for soft-deleted orgs. */
export const DELETED_FILTER = 'DELETED';

export interface OrgListQuery {
  skip: number;
  take: number;
  search?: string;
  status?: string;
  orderBy?: OrderByEntry[];
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

  async countOrgsByType(): Promise<Partial<Record<OrgType, number>>> {
    const rows = await this.prisma.organization.groupBy({
      by: ['orgType'],
      where: LIVE_ORG,
      _count: { orgType: true },
    });
    return Object.fromEntries(rows.map((r) => [r.orgType, r._count.orgType]));
  }

  async subscriptionStatusCounts(): Promise<Partial<Record<SubscriptionStatus, number>>> {
    const rows = await this.prisma.subscription.groupBy({
      by: ['status'],
      where: { organization: LIVE_ORG },
      _count: { status: true },
    });
    return Object.fromEntries(rows.map((r) => [r.status, r._count.status]));
  }

  /** Paying subscriptions — ACTIVE on a priced plan (free plans excluded) — by currency and cycle. */
  async activeRevenueRows(): Promise<RevenueRow[]> {
    const rows = await this.prisma.subscription.groupBy({
      by: ['currency', 'billingCycle'],
      where: { status: SubscriptionStatus.ACTIVE, priceInCents: { gt: 0 }, organization: LIVE_ORG },
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

  /** Trials (on live orgs) whose trial ends between now and `before`. */
  countTrialsEndingBefore(before: Date): Promise<number> {
    return this.prisma.subscription.count({
      where: {
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: { gte: new Date(), lte: before },
        organization: LIVE_ORG,
      },
    });
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
    return this.prisma.helpTicket.count({ where: { status: 'OPEN', organization: LIVE_ORG } });
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

  /** SubscriptionEvent has no organization relation, so deleted orgs are excluded by id. */
  async recentSubscriptionEvents(take: number) {
    const deleted = await this.deletedOrgIds();
    return this.prisma.subscriptionEvent.findMany({
      where: deleted.length ? { orgId: { notIn: deleted } } : {},
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, orgId: true, previousStatus: true, newStatus: true, createdAt: true },
    });
  }

  recentTickets(take: number) {
    return this.prisma.helpTicket.findMany({
      where: { organization: LIVE_ORG },
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

  /** Deleted orgs keep a name, marked, so history entries stay readable. */
  async orgNames(ids: string[]): Promise<Map<string, string>> {
    if (!ids.length) return new Map();
    const orgs = await this.prisma.organization.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, deletedAt: true },
    });
    return new Map(orgs.map((o) => [o.id, o.deletedAt ? `${o.name} (deleted)` : o.name]));
  }

  /** Ids of soft-deleted orgs — a small set; used where there is no organization relation. */
  private async deletedOrgIds(): Promise<string[]> {
    const rows = await this.prisma.organization.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  // ── Organizations ──

  /**
   * Status filter is applied in SQL (before pagination) so totals are right:
   *   live status (ACTIVE/TRIAL/…) → has a subscription in that status
   *   EXPIRED / CANCELLED           → has one in that status and no live one
   *   NONE                          → never subscribed
   */
  private orgWhere(search?: string, status?: string): Prisma.OrganizationWhereInput {
    // DELETED lists soft-deleted orgs (to restore them); every other filter hides them
    if (status === DELETED_FILTER) {
      return {
        deletedAt: { not: null },
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };
    }
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
        orderBy: (query.orderBy ?? NEWEST_FIRST) as Prisma.OrganizationOrderByWithRelationInput[],
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

  /** Includes soft-deleted orgs: the detail page shows them with a Restore option. */
  findOrgDetail(orgId: string) {
    return this.prisma.organization.findFirst({
      where: { id: orgId },
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
            // Lifetime count scans every message the org ever sent: last 30 days only,
            // served by the (orgId, createdAt) index
            messages: { where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
          },
        },
      },
    });
  }

  // ── Org lifecycle (edit / delete / restore / export) ──

  /** Org row including soft-deleted ones — for restore and the deleted-org detail view. */
  findOrgAnyState(orgId: string) {
    return this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, slug: true, timezone: true, status: true, deletedAt: true },
    });
  }

  async slugTaken(slug: string, exceptOrgId: string): Promise<boolean> {
    const hit = await this.prisma.organization.findFirst({
      where: { slug, id: { not: exceptOrgId } },
      select: { id: true },
    });
    return hit !== null;
  }

  updateOrgIdentity(orgId: string, data: { name?: string; slug?: string; timezone?: string }) {
    return this.prisma.organization.update({
      where: { id: orgId },
      data,
      select: { id: true, name: true, slug: true, timezone: true },
    });
  }

  /**
   * Soft-deletes the org, revokes every tenant session and cancels its live subscription
   * in one transaction. Returns what was revoked/cancelled for the audit entry.
   */
  async softDeleteOrg(orgId: string, reason: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.organization.update({ where: { id: orgId }, data: { deletedAt: new Date() } });
      const sessions = await tx.session.updateMany({
        where: { orgId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      const live = await tx.subscription.findFirst({
        where: { orgId, status: { in: LIVE_SUBSCRIPTION_STATUSES } },
        select: { id: true, status: true },
      });
      if (live) {
        await tx.subscription.update({
          where: { id: live.id },
          data: {
            status: SubscriptionStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelReason: `Organization deleted: ${reason}`.slice(0, 500),
            scheduledPlanId: null,
            scheduledChangeAt: null,
          },
        });
        await tx.subscriptionEvent.create({
          data: {
            orgId,
            subscriptionId: live.id,
            previousStatus: live.status,
            newStatus: SubscriptionStatus.CANCELLED,
            triggeredById: actorId,
            reason: 'Organization deleted',
            metadata: { by: 'SUPER_ADMIN', type: 'org_deleted' },
          },
        });
      }
      return { sessionsRevoked: sessions.count, cancelledSubscriptionId: live?.id ?? null };
    });
  }

  async restoreOrg(orgId: string): Promise<void> {
    await this.prisma.organization.update({ where: { id: orgId }, data: { deletedAt: null } });
  }

  /**
   * Everything an org export contains. Users and contacts carry no credentials; message
   * content is not exported (counts only). Contacts are capped at `contactLimit`.
   */
  async orgExportData(orgId: string, contactLimit: number) {
    const [org, users, contacts, contactTotal, subscriptions, invoices, payments, messages, campaigns, conversations] =
      await Promise.all([
        this.prisma.organization.findUnique({
          where: { id: orgId },
          select: {
            id: true, name: true, slug: true, orgType: true, timezone: true, status: true,
            suspendedAt: true, suspendReason: true, createdAt: true, deletedAt: true,
          },
        }),
        this.prisma.user.findMany({
          where: { orgId },
          select: {
            id: true, firstName: true, lastName: true, email: true, role: true, status: true,
            createdAt: true, lastLoginAt: true, deletedAt: true,
          },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.contact.findMany({
          where: { orgId, deletedAt: null },
          select: {
            id: true, name: true, phoneNumber: true, email: true, source: true, leadStatus: true,
            optedOut: true, optedOutAt: true, createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
          take: contactLimit,
        }),
        this.prisma.contact.count({ where: { orgId, deletedAt: null } }),
        this.prisma.subscription.findMany({
          where: { orgId },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true, status: true, billingCycle: true, priceInCents: true, currency: true,
            currentPeriodStart: true, currentPeriodEnd: true, trialEndsAt: true, cancelledAt: true,
            createdAt: true, plan: { select: { name: true, slug: true, version: true } },
          },
        }),
        this.prisma.invoice.findMany({
          where: { orgId },
          orderBy: { createdAt: 'asc' },
          select: { id: true, invoiceNumber: true, status: true, amountInCents: true, currency: true, createdAt: true },
        }),
        this.prisma.payment.findMany({
          where: { orgId },
          orderBy: { createdAt: 'asc' },
          select: { id: true, status: true, amountInCents: true, currency: true, paymentMethod: true, paidAt: true, createdAt: true },
        }),
        this.prisma.message.count({ where: { orgId } }),
        this.prisma.campaign.count({ where: { orgId, deletedAt: null } }),
        this.prisma.conversation.count({ where: { orgId } }),
      ]);
    return {
      org, users, contacts, contactTotal, subscriptions, invoices, payments,
      counts: { messages, campaigns, conversations },
    };
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

  /** `search` matches the org name or the linked invoice number. */
  async findPayments(
    skip: number,
    take: number,
    filter: { status?: PaymentStatus; orgId?: string; search?: string },
    orderBy: OrderByEntry[] = NEWEST_FIRST,
  ) {
    const where: Prisma.PaymentWhereInput = {
      ...(filter.status && { status: filter.status }),
      ...(filter.orgId && { orgId: filter.orgId }),
      ...(filter.search && {
        OR: [
          { organization: { name: { contains: filter.search, mode: 'insensitive' } } },
          { invoice: { invoiceNumber: { contains: filter.search, mode: 'insensitive' } } },
        ],
      }),
    };
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: orderBy as Prisma.PaymentOrderByWithRelationInput[],
        include: {
          organization: { select: { id: true, name: true, deletedAt: true } },
          invoice: { select: { id: true, invoiceNumber: true } },
          refunds: {
            orderBy: { createdAt: 'asc' },
            select: { id: true, amountInCents: true, reason: true, externalRefundId: true, createdAt: true },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { payments, total };
  }

  /** `search` matches the org name or the invoice number. */
  async findInvoices(
    skip: number,
    take: number,
    filter: { status?: InvoiceStatus; orgId?: string; search?: string },
    orderBy: OrderByEntry[] = NEWEST_FIRST,
  ) {
    const where: Prisma.InvoiceWhereInput = {
      ...(filter.status && { status: filter.status }),
      ...(filter.orgId && { orgId: filter.orgId }),
      ...(filter.search && {
        OR: [
          { organization: { name: { contains: filter.search, mode: 'insensitive' } } },
          { invoiceNumber: { contains: filter.search, mode: 'insensitive' } },
        ],
      }),
    };
    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: orderBy as Prisma.InvoiceOrderByWithRelationInput[],
        include: { organization: { select: { id: true, name: true, deletedAt: true } } },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { invoices, total };
  }

  /**
   * Records a refund under a row lock on the payment, so concurrent records can never
   * refund more than was paid. `decide` sees the locked state and may refuse (throw).
   */
  async recordRefund(
    paymentId: string,
    input: { amountInCents: number; reason: string; externalRefundId?: string; createdById: string },
    decide: (
      payment: { status: string; amountInCents: number; currency: string; orgId: string },
      refunded: number,
    ) => { fullyRefunded: boolean },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ status: string; amountInCents: number; currency: string; orgId: string }[]>`
        SELECT status::text AS status, amount_in_cents AS "amountInCents", currency, org_id::text AS "orgId"
        FROM payments WHERE id = ${paymentId}::uuid FOR UPDATE`;
      const payment = locked[0];
      if (!payment) return null;
      const sum = await tx.paymentRefund.aggregate({ where: { paymentId }, _sum: { amountInCents: true } });
      const refunded = sum._sum.amountInCents ?? 0;
      const { fullyRefunded } = decide(payment, refunded);

      const refund = await tx.paymentRefund.create({
        data: {
          paymentId,
          orgId: payment.orgId,
          amountInCents: input.amountInCents,
          currency: payment.currency,
          reason: input.reason,
          externalRefundId: input.externalRefundId ?? null,
          createdById: input.createdById,
        },
      });
      if (fullyRefunded) {
        await tx.payment.update({ where: { id: paymentId }, data: { status: PaymentStatus.REFUNDED } });
      }
      return { refund, payment, refundedBefore: refunded, fullyRefunded };
    });
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

  // ── Usage analytics (messages, UTC days) ──

  /** Messages per UTC day and direction since `since`, with outbound failures; deleted orgs excluded. */
  messagesByDay(since: Date): Promise<DayDirectionRow[]> {
    return this.prisma.$queryRaw<DayDirectionRow[]>`
      SELECT to_char(date_trunc('day', m.created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
             m.direction::text AS direction,
             count(*)::int AS total,
             (count(*) FILTER (WHERE m.status = 'FAILED'))::int AS failed
      FROM messages m
      JOIN organizations o ON o.id = m.org_id AND o.deleted_at IS NULL
      WHERE m.created_at >= ${since} AND m.deleted_at IS NULL
      GROUP BY 1, 2`;
  }

  /** Orgs that sent the most outbound messages since `since`. */
  topOrgsByOutbound(since: Date, take: number) {
    return this.prisma.$queryRaw<{ orgId: string; name: string; outbound: number; failed: number }[]>`
      SELECT o.id::text AS "orgId", o.name,
             count(*)::int AS outbound,
             (count(*) FILTER (WHERE m.status = 'FAILED'))::int AS failed
      FROM messages m
      JOIN organizations o ON o.id = m.org_id AND o.deleted_at IS NULL
      WHERE m.created_at >= ${since} AND m.deleted_at IS NULL AND m.direction = 'OUTBOUND'
      GROUP BY o.id, o.name
      ORDER BY outbound DESC
      LIMIT ${take}`;
  }

  // ── Global search (super admin header) ──

  /** Top matches per kind for one search term; each list is capped at `take`. */
  async globalSearch(term: string, take: number) {
    const contains = { contains: term, mode: 'insensitive' as const };
    const [orgs, users, sessions, tickets, invoices] = await Promise.all([
      this.prisma.organization.findMany({
        where: { OR: [{ name: contains }, { slug: contains }] },
        select: { id: true, name: true, slug: true, deletedAt: true },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.user.findMany({
        where: { deletedAt: null, OR: [{ email: contains }, { firstName: contains }, { lastName: contains }] },
        select: { id: true, firstName: true, lastName: true, email: true, organization: { select: { id: true, name: true } } },
        take,
      }),
      this.prisma.whatsAppSession.findMany({
        where: { deletedAt: null, phoneNumber: contains },
        select: { id: true, phoneNumber: true, status: true, organization: { select: { id: true, name: true } } },
        take,
      }),
      this.prisma.helpTicket.findMany({
        where: { title: contains },
        select: { id: true, title: true, status: true, organization: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.invoice.findMany({
        where: { invoiceNumber: contains },
        select: { id: true, invoiceNumber: true, status: true, organization: { select: { id: true, name: true } } },
        take,
      }),
    ]);
    return { orgs, users, phoneNumbers: sessions, tickets, invoices };
  }

  // ── Subscriptions ──

  /** `search` matches the org name or slug. */
  async findSubscriptions(
    skip: number,
    take: number,
    status?: SubscriptionStatus,
    search?: string,
    orderBy: OrderByEntry[] = NEWEST_FIRST,
  ) {
    const where: Prisma.SubscriptionWhereInput = {
      organization: search
        ? {
            ...LIVE_ORG,
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
            ],
          }
        : LIVE_ORG,
      ...(status && { status }),
    };
    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take,
        orderBy: orderBy as Prisma.SubscriptionOrderByWithRelationInput[],
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
