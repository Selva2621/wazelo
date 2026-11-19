import { Injectable } from '@nestjs/common';
import { AiCreditEntry, AiCreditEntryKind, AiCreditPack, Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export interface AiCreditPackInput {
  name: string;
  credits: number;
  priceInCents: number;
  currency: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface AiUsageStats {
  calls: number;
  credits: number;
  byAction: { action: string; calls: number; credits: number }[];
  topOrgs: { orgId: string; orgName: string; credits: number }[];
}

/** AI credit packs, the purchased balance per org, and the credit ledger. */
@Injectable()
export class AiCreditRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Balance ──

  async getBalance(orgId: string): Promise<number> {
    const row = await this.prisma.orgAiCreditBalance.findUnique({ where: { orgId } });
    return row?.balance ?? 0;
  }

  /**
   * Takes up to `amount` purchased credits in one locked statement, so two
   * concurrent charges can never drive the balance below zero. Returns what was taken.
   */
  async takePurchased(orgId: string, amount: number): Promise<number> {
    if (amount <= 0) return 0;
    const rows = await this.prisma.$queryRaw<{ taken: number }[]>`
      WITH prev AS (
        SELECT balance FROM org_ai_credit_balances WHERE org_id = ${orgId}::uuid FOR UPDATE
      )
      UPDATE org_ai_credit_balances b
      SET balance = b.balance - LEAST(prev.balance, ${amount}), updated_at = now()
      FROM prev
      WHERE b.org_id = ${orgId}::uuid
      RETURNING LEAST(prev.balance, ${amount})::int AS taken`;
    return rows[0]?.taken ?? 0;
  }

  // ── Ledger ──

  async recordUsage(input: {
    orgId: string;
    action: string;
    planCredits: number;
    purchasedCredits: number;
  }): Promise<void> {
    await this.prisma.aiCreditEntry.create({
      data: {
        orgId: input.orgId,
        kind: AiCreditEntryKind.USAGE,
        action: input.action,
        planCredits: input.planCredits,
        purchasedCredits: -input.purchasedCredits,
      },
    });
  }

  /**
   * Adds a bought pack to the balance, once per idempotency key (the Razorpay order).
   * Returns false when this purchase was already credited.
   */
  async addPurchase(input: {
    orgId: string;
    credits: number;
    packId: string;
    paymentId: string | null;
    idempotencyKey: string;
  }, retried = false): Promise<boolean> {
    try {
      await this.prisma.$transaction([
        this.prisma.aiCreditEntry.create({
          data: {
            orgId: input.orgId,
            kind: AiCreditEntryKind.PURCHASE,
            purchasedCredits: input.credits,
            packId: input.packId,
            paymentId: input.paymentId,
            idempotencyKey: input.idempotencyKey,
          },
        }),
        this.prisma.orgAiCreditBalance.upsert({
          where: { orgId: input.orgId },
          create: { orgId: input.orgId, balance: input.credits },
          update: { balance: { increment: input.credits } },
        }),
      ]);
      return true;
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') throw err;
      const target = String((err.meta as { target?: unknown } | undefined)?.target ?? '');
      // This order was already credited (verify and webhook both landed)
      if (target.includes('idempotency_key') || target.includes('idempotencyKey')) return false;
      // Two first-ever purchases raced to create the balance row; the row exists now, so retry once
      if (!retried) return this.addPurchase(input, true);
      throw err;
    }
  }

  async linkPayment(idempotencyKey: string, paymentId: string): Promise<void> {
    await this.prisma.aiCreditEntry.update({ where: { idempotencyKey }, data: { paymentId } });
  }

  async findPurchaseByKey(idempotencyKey: string): Promise<AiCreditEntry | null> {
    return this.prisma.aiCreditEntry.findUnique({ where: { idempotencyKey } });
  }

  async listEntries(orgId: string, take: number, skip: number): Promise<{ entries: AiCreditEntry[]; total: number }> {
    const where = { orgId };
    const [entries, total] = await Promise.all([
      this.prisma.aiCreditEntry.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
      this.prisma.aiCreditEntry.count({ where }),
    ]);
    return { entries, total };
  }

  // ── Packs ──

  listPacks(options: { currency?: string; activeOnly?: boolean } = {}): Promise<AiCreditPack[]> {
    return this.prisma.aiCreditPack.findMany({
      where: {
        ...(options.currency && { currency: options.currency }),
        ...(options.activeOnly && { isActive: true }),
      },
      orderBy: [{ currency: 'asc' }, { sortOrder: 'asc' }, { credits: 'asc' }],
    });
  }

  findPack(id: string): Promise<AiCreditPack | null> {
    return this.prisma.aiCreditPack.findUnique({ where: { id } });
  }

  createPack(input: AiCreditPackInput): Promise<AiCreditPack> {
    return this.prisma.aiCreditPack.create({ data: input });
  }

  updatePack(id: string, input: Partial<AiCreditPackInput>): Promise<AiCreditPack> {
    return this.prisma.aiCreditPack.update({ where: { id }, data: input });
  }

  /** How a pack has sold: purchases, credits, revenue (from the recorded payments), latest buyers. */
  async packSales(packId: string, recentLimit = 10) {
    const where = { packId, kind: AiCreditEntryKind.PURCHASE };
    const [totals, paymentRows, recent, buyers] = await Promise.all([
      this.prisma.aiCreditEntry.aggregate({
        where,
        _count: { _all: true },
        _sum: { purchasedCredits: true },
      }),
      this.prisma.aiCreditEntry.findMany({ where: { ...where, paymentId: { not: null } }, select: { paymentId: true } }),
      this.prisma.aiCreditEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: recentLimit,
        select: { id: true, orgId: true, purchasedCredits: true, createdAt: true, organization: { select: { name: true } } },
      }),
      this.prisma.aiCreditEntry.groupBy({ by: ['orgId'], where }),
    ]);
    const revenue = paymentRows.length
      ? await this.prisma.payment.aggregate({
          where: { id: { in: paymentRows.map((r) => r.paymentId!) }, status: 'SUCCEEDED' },
          _sum: { amountInCents: true },
        })
      : null;

    return {
      purchases: totals._count._all,
      creditsSold: totals._sum.purchasedCredits ?? 0,
      revenueInCents: revenue?._sum.amountInCents ?? 0,
      buyers: buyers.length,
      recent: recent.map((r) => ({
        id: r.id,
        orgId: r.orgId,
        orgName: r.organization.name,
        credits: r.purchasedCredits,
        createdAt: r.createdAt,
      })),
    };
  }

  // ── Platform stats (super admin) ──

  async usageSince(since: Date): Promise<AiUsageStats> {
    const where = { kind: AiCreditEntryKind.USAGE, createdAt: { gte: since } };
    const [byAction, byOrg] = await Promise.all([
      this.prisma.aiCreditEntry.groupBy({
        by: ['action'],
        where,
        _count: { _all: true },
        _sum: { planCredits: true, purchasedCredits: true },
      }),
      this.prisma.aiCreditEntry.groupBy({
        by: ['orgId'],
        where,
        _sum: { planCredits: true, purchasedCredits: true },
      }),
    ]);

    // purchasedCredits is negative on USAGE rows
    const spent = (s: { planCredits: number | null; purchasedCredits: number | null }) =>
      (s.planCredits ?? 0) - (s.purchasedCredits ?? 0);

    const actions = byAction
      .map((a) => ({ action: a.action ?? 'unknown', calls: a._count._all, credits: spent(a._sum) }))
      .sort((a, b) => b.credits - a.credits);

    const top = byOrg
      .map((o) => ({ orgId: o.orgId, credits: spent(o._sum) }))
      .sort((a, b) => b.credits - a.credits)
      .slice(0, 5);
    const orgs = await this.prisma.organization.findMany({
      where: { id: { in: top.map((t) => t.orgId) } },
      select: { id: true, name: true },
    });
    const names = new Map(orgs.map((o) => [o.id, o.name]));

    return {
      calls: actions.reduce((n, a) => n + a.calls, 0),
      credits: actions.reduce((n, a) => n + a.credits, 0),
      byAction: actions,
      topOrgs: top.map((t) => ({ ...t, orgName: names.get(t.orgId) ?? 'Deleted org' })),
    };
  }
}
