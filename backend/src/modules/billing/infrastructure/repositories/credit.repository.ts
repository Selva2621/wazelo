import { Injectable } from '@nestjs/common';
import { CreditEntryKind, OrgCreditEntry, Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export interface CreditEntryInput {
  orgId: string;
  currency: string;
  /** Signed minor units: + grant, − applied / revoked */
  amountInCents: number;
  kind: CreditEntryKind;
  reason: string;
  invoiceId?: string | null;
  idempotencyKey?: string | null;
  createdById?: string | null;
}

/**
 * Account credit ledger (append-only). Every balance-changing write first locks the
 * org row (SELECT … FOR UPDATE) inside the caller's transaction, so concurrent
 * grants / revokes / renewals for one org serialize and the balance read is exact.
 */
@Injectable()
export class CreditRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Runs `work` in a transaction holding the org row lock. Returns null if the org doesn't exist. */
  async withOrgLock<T>(orgId: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T | null> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT id::text AS id FROM organizations WHERE id = ${orgId}::uuid FOR UPDATE`;
      if (!rows.length) return null;
      return work(tx);
    });
  }

  async balance(orgId: string, currency: string, tx?: Prisma.TransactionClient): Promise<number> {
    const sum = await (tx ?? this.prisma).orgCreditEntry.aggregate({
      where: { orgId, currency },
      _sum: { amountInCents: true },
    });
    return sum._sum.amountInCents ?? 0;
  }

  /** Has the org any credit at all in this currency? Cheap pre-check before locking. */
  async hasPositiveBalance(orgId: string, currency: string): Promise<boolean> {
    return (await this.balance(orgId, currency)) > 0;
  }

  async balances(orgId: string): Promise<{ currency: string; balanceInCents: number }[]> {
    const rows = await this.prisma.orgCreditEntry.groupBy({
      by: ['currency'],
      where: { orgId },
      _sum: { amountInCents: true },
      orderBy: { currency: 'asc' },
    });
    return rows.map((r) => ({ currency: r.currency, balanceInCents: r._sum.amountInCents ?? 0 }));
  }

  entries(orgId: string, take: number) {
    return this.prisma.orgCreditEntry.findMany({
      where: { orgId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      include: { invoice: { select: { invoiceNumber: true } } },
    });
  }

  findByIdempotencyKey(key: string, tx?: Prisma.TransactionClient): Promise<OrgCreditEntry | null> {
    return (tx ?? this.prisma).orgCreditEntry.findUnique({ where: { idempotencyKey: key } });
  }

  create(input: CreditEntryInput, tx?: Prisma.TransactionClient): Promise<OrgCreditEntry> {
    return (tx ?? this.prisma).orgCreditEntry.create({
      data: {
        orgId: input.orgId,
        currency: input.currency,
        amountInCents: input.amountInCents,
        kind: input.kind,
        reason: input.reason,
        invoiceId: input.invoiceId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        createdById: input.createdById ?? null,
      },
    });
  }
}
