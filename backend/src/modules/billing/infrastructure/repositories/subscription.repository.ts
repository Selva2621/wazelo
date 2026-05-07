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

  async create(input: CreateSubscriptionInput): Promise<Subscription> {
    return this.prisma.subscription.create({
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

  async findById(id: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({ where: { id } });
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
  ): Promise<Subscription | null> {
    const statusFilter = Array.isArray(expectedStatus)
      ? { in: expectedStatus }
      : expectedStatus;

    const result = await this.prisma.subscription.updateMany({
      where: { id, status: statusFilter as any },
      data: { status: newStatus, ...extra },
    });

    if (result.count === 0) return null;
    return this.findById(id);
  }

  async updatePlan(
    id: string,
    planId: string,
    priceInCents: number,
    extra?: Record<string, unknown>,
  ): Promise<Subscription | null> {
    const result = await this.prisma.subscription.updateMany({
      where: {
        id,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      },
      data: { planId, priceInCents, ...extra },
    });

    if (result.count === 0) return null;
    return this.findById(id);
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

  async findSubscriptionsDueForRenewal(beforeTime: Date): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: { lte: beforeTime },
      },
      include: { plan: true },
    });
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
  }): Promise<void> {
    await this.prisma.subscriptionEvent.create({
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
