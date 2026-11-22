import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import {
  Subscription,
  SubscriptionStatus,
  Prisma,
} from '@prisma/client';

export interface CreateSubscriptionInput {
  orgId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: string;
  priceInCents: number;
  currency?: string;
  trialEndsAt?: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  externalId?: string;
  externalCustomerId?: string;
  idempotencyKey?: string;
}

@Injectable()
export class SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @param tx run inside the caller's transaction */
  async create(input: CreateSubscriptionInput, tx?: Prisma.TransactionClient): Promise<Subscription> {
    return (tx ?? this.prisma).subscription.create({
      data: {
        orgId: input.orgId,
        planId: input.planId,
        status: input.status,
        billingCycle: input.billingCycle as any,
        priceInCents: input.priceInCents,
        currency: input.currency || 'USD',
        trialEndsAt: input.trialEndsAt || null,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        externalId: input.externalId || null,
        externalCustomerId: input.externalCustomerId || null,
        idempotencyKey: input.idempotencyKey || null,
      },
    });
  }

  /**
   * Locks the subscription row for the rest of `tx` (SELECT … FOR UPDATE) and reads it,
   * so a read-modify-write (e.g. metadata.prepaid) can't lose a concurrent update.
   */
  async lockForUpdate(id: string, tx: Prisma.TransactionClient): Promise<Subscription | null> {
    await tx.$queryRaw`SELECT id FROM subscriptions WHERE id = ${id}::uuid FOR UPDATE`;
    return tx.subscription.findUnique({ where: { id } });
  }

  /** Runs `work` in a transaction holding the subscription row lock (row passed in, null if gone) */
  async withLock<T>(id: string, work: (sub: Subscription | null, tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => work(await this.lockForUpdate(id, tx), tx));
  }

  async findById(id: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({ where: { id }, include: { plan: true } });
  }

  async findByIdempotencyKey(key: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({
      where: { idempotencyKey: key },
    });
  }

  async findByExternalId(externalId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({
      where: { externalId },
    });
  }

  async findActiveByOrg(orgId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findFirst({
      where: {
        orgId,
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIAL,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.GRACE_PERIOD,
          ],
        },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** The org's newest subscription in any status. */
  async findLatestByOrg(orgId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findFirst({ where: { orgId }, orderBy: { createdAt: 'desc' } });
  }

  /** The org ever had a plan or trial (so it finished onboarding), even if it has ended */
  async hasHadPlan(orgId: string): Promise<boolean> {
    return (await this.prisma.subscription.count({ where: { orgId } })) > 0;
  }

  async findByOrgWithPlan(orgId: string): Promise<(Subscription & { plan: any }) | null> {
    return this.prisma.subscription.findFirst({
      where: {
        orgId,
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIAL,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.GRACE_PERIOD,
          ],
        },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async transitionStatus(
    id: string,
    expectedStatus: SubscriptionStatus | SubscriptionStatus[],
    newStatus: SubscriptionStatus,
    extra?: Record<string, unknown>,
    tx?: Prisma.TransactionClient,
  ): Promise<Subscription | null> {
    const statusFilter = Array.isArray(expectedStatus)
      ? { in: expectedStatus }
      : expectedStatus;
    const db = tx ?? this.prisma;

    const result = await db.subscription.updateMany({
      where: { id, status: statusFilter as any },
      data: { status: newStatus, ...extra },
    });

    if (result.count === 0) return null;
    return db.subscription.findUnique({ where: { id }, include: { plan: true } });
  }

  /** @param tx run inside the caller's transaction (the re-read uses it too) */
  async updatePlan(
    id: string,
    planId: string,
    priceInCents: number,
    extra?: Record<string, unknown>,
    tx?: Prisma.TransactionClient,
  ): Promise<Subscription | null> {
    const db = tx ?? this.prisma;
    const result = await db.subscription.updateMany({
      where: {
        id,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      },
      data: { planId, priceInCents, ...extra },
    });

    if (result.count === 0) return null;
    return db.subscription.findUnique({ where: { id }, include: { plan: true } });
  }

  async scheduleDowngrade(
    id: string,
    scheduledPlanId: string,
    scheduledChangeAt: Date,
  ): Promise<Subscription | null> {
    const result = await this.prisma.subscription.updateMany({
      where: {
        id,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      },
      data: { scheduledPlanId, scheduledChangeAt },
    });

    if (result.count === 0) return null;
    return this.findById(id);
  }

  async clearScheduledDowngrade(id: string): Promise<void> {
    await this.prisma.subscription.update({
      where: { id },
      data: { scheduledPlanId: null, scheduledChangeAt: null },
    });
  }

  /**
   * Periods that have run out. PAST_DUE (left over from the retired auto-charge retries)
   * is included so those subscriptions end too instead of staying stuck.
   */
  async findSubscriptionsDueForRenewal(beforeTime: Date): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
        currentPeriodEnd: { lte: beforeTime },
      },
      include: { plan: true },
    });
  }

  /** ACTIVE paid plans, not cancelled, whose period ends in [from, to) — renewal reminders */
  async findPaidRenewalsEndingBetween(from: Date, to: Date) {
    return this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        priceInCents: { gt: 0 },
        cancelledAt: null,
        currentPeriodEnd: { gte: from, lt: to },
      },
      include: { plan: { select: { name: true } } },
    });
  }

  /** Has a subscription event with this metadata `type` + `key` been recorded? (once-only markers) */
  async hasEventWithKey(subscriptionId: string, type: string, key: string): Promise<boolean> {
    const found = await this.prisma.subscriptionEvent.findFirst({
      where: {
        subscriptionId,
        AND: [
          { metadata: { path: ['type'], equals: type } },
          { metadata: { path: ['key'], equals: key } },
        ],
      },
      select: { id: true },
    });
    return !!found;
  }

  async findExpiredTrials(beforeTime: Date): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: { lte: beforeTime },
      },
      include: { plan: true },
    });
  }

  async findExpiredGracePeriods(beforeTime: Date): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.GRACE_PERIOD,
        graceEndsAt: { lte: beforeTime },
      },
    });
  }

  async findScheduledDowngrades(beforeTime: Date): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({
      where: {
        scheduledPlanId: { not: null },
        scheduledChangeAt: { lte: beforeTime },
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      },
      include: { plan: true },
    });
  }

  async recordEvent(data: {
    orgId: string;
    subscriptionId: string;
    previousStatus?: SubscriptionStatus;
    newStatus: SubscriptionStatus;
    previousPlanId?: string;
    newPlanId?: string;
    triggeredById?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).subscriptionEvent.create({
      data: {
        orgId: data.orgId,
        subscriptionId: data.subscriptionId,
        previousStatus: data.previousStatus || null,
        newStatus: data.newStatus,
        previousPlanId: data.previousPlanId || null,
        newPlanId: data.newPlanId || null,
        triggeredById: data.triggeredById || null,
        reason: data.reason || null,
        metadata: (data.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }
}
