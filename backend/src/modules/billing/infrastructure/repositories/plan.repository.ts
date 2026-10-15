import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Plan, BillingCycle, Prisma, SubscriptionStatus } from '@prisma/client';

export interface CreatePlanInput {
  name: string;
  slug: string;
  description?: string;
  billingCycle: BillingCycle;
  priceInCents: number;
  currency?: string;
  trialDays?: number;
  maxUsers: number;
  maxWhatsappSessions: number;
  maxMessagesPerMonth: number;
  maxCampaignsPerMonth: number;
  campaignsEnabled: boolean;
  automationEnabled: boolean;
  apiEnabled: boolean;
  maxApiCallsPerMonth: number;
  aiCreditsPerMonth: number;
  aiEnabled: boolean;
  maxMessageTemplates: number;
  shopifyEnabled: boolean;
  maxShopifyStores: number;
  softLimitPercent?: number;
  gracePeriodDays?: number;
  isDefault?: boolean;
  sortOrder?: number;
}

@Injectable()
export class PlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreatePlanInput): Promise<Plan> {
    // Find the latest version for this slug+billingCycle
    const latest = await this.prisma.plan.findFirst({
      where: { slug: input.slug, billingCycle: input.billingCycle, deletedAt: null },
      orderBy: { version: 'desc' },
    });

    return this.prisma.plan.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description || null,
        billingCycle: input.billingCycle,
        priceInCents: input.priceInCents,
        currency: input.currency || 'USD',
        version: latest ? latest.version + 1 : 1,
        trialDays: input.trialDays ?? 0,
        maxUsers: input.maxUsers,
        maxWhatsappSessions: input.maxWhatsappSessions,
        maxMessagesPerMonth: input.maxMessagesPerMonth,
        maxCampaignsPerMonth: input.maxCampaignsPerMonth,
        campaignsEnabled: input.campaignsEnabled,
        automationEnabled: input.automationEnabled,
        apiEnabled: input.apiEnabled,
        maxApiCallsPerMonth: input.maxApiCallsPerMonth,
        aiCreditsPerMonth: input.aiCreditsPerMonth,
        aiEnabled: input.aiEnabled,
        maxMessageTemplates: input.maxMessageTemplates,
        shopifyEnabled: input.shopifyEnabled,
        maxShopifyStores: input.maxShopifyStores,
        softLimitPercent: input.softLimitPercent ?? 80,
        gracePeriodDays: input.gracePeriodDays ?? 3,
        isDefault: input.isDefault ?? false,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  }

  async findById(id: string): Promise<Plan | null> {
    return this.prisma.plan.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findActiveBySlugAndCycle(slug: string, billingCycle: BillingCycle): Promise<Plan | null> {
    return this.prisma.plan.findFirst({
      where: { slug, billingCycle, isActive: true, deletedAt: null },
      orderBy: { version: 'desc' },
    });
  }

  async findAllActive(): Promise<Plan[]> {
    // Return the latest active version of each slug+billingCycle combination
    return this.prisma.plan.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }, { billingCycle: 'asc' }],
    });
  }

  /** Every non-deleted plan, active or not — for the super admin plan list. */
  async findAllForAdmin(): Promise<Plan[]> {
    return this.prisma.plan.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }, { billingCycle: 'asc' }, { version: 'desc' }],
    });
  }

  async findDefault(): Promise<Plan | null> {
    return this.prisma.plan.findFirst({
      where: { isDefault: true, isActive: true, deletedAt: null },
    });
  }

  async update(id: string, data: Partial<Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Plan> {
    return this.prisma.plan.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.priceInCents !== undefined && { priceInCents: data.priceInCents }),
        ...(data.trialDays !== undefined && { trialDays: data.trialDays }),
        ...(data.maxUsers !== undefined && { maxUsers: data.maxUsers }),
        ...(data.maxWhatsappSessions !== undefined && { maxWhatsappSessions: data.maxWhatsappSessions }),
        ...(data.maxMessagesPerMonth !== undefined && { maxMessagesPerMonth: data.maxMessagesPerMonth }),
        ...(data.maxCampaignsPerMonth !== undefined && { maxCampaignsPerMonth: data.maxCampaignsPerMonth }),
        ...(data.campaignsEnabled !== undefined && { campaignsEnabled: data.campaignsEnabled }),
        ...(data.automationEnabled !== undefined && { automationEnabled: data.automationEnabled }),
        ...(data.apiEnabled !== undefined && { apiEnabled: data.apiEnabled }),
        ...(data.maxApiCallsPerMonth !== undefined && { maxApiCallsPerMonth: data.maxApiCallsPerMonth }),
        ...(data.aiEnabled !== undefined && { aiEnabled: data.aiEnabled }),
        ...(data.aiCreditsPerMonth !== undefined && { aiCreditsPerMonth: data.aiCreditsPerMonth }),
        ...(data.maxMessageTemplates !== undefined && { maxMessageTemplates: data.maxMessageTemplates }),
        ...(data.shopifyEnabled !== undefined && { shopifyEnabled: data.shopifyEnabled }),
        ...(data.maxShopifyStores !== undefined && { maxShopifyStores: data.maxShopifyStores }),
        ...(data.softLimitPercent !== undefined && { softLimitPercent: data.softLimitPercent }),
        ...(data.gracePeriodDays !== undefined && { gracePeriodDays: data.gracePeriodDays }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });
  }

  /** Live (not cancelled/expired) subscriptions per plan id — plans with none are absent. */
  async countLiveSubscribers(planIds?: string[]): Promise<Map<string, number>> {
    const rows = await this.prisma.subscription.groupBy({
      by: ['planId'],
      where: {
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.PAST_DUE, SubscriptionStatus.GRACE_PERIOD] },
        ...(planIds && { planId: { in: planIds } }),
      },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.planId, r._count._all]));
  }

  /**
   * Publishes `changes` as the next version of `current` (same slug + billing cycle) and
   * retires `current` from sale. Its subscribers stay on it, keeping their limits and features.
   * The default-plan flag moves to the new version.
   */
  async createNextVersion(current: Plan, changes: Partial<Plan>): Promise<Plan> {
    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.plan.findFirst({
        where: { slug: current.slug, billingCycle: current.billingCycle },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, archivedAt: _a, version: _v, metadata, ...fields } =
        current;
      const next = await tx.plan.create({
        data: {
          ...fields,
          ...changes,
          // Json columns take Prisma.JsonNull, not null
          metadata: metadata === null ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue),
          version: (latest?.version ?? current.version) + 1,
          isDefault: current.isDefault,
        } as Prisma.PlanUncheckedCreateInput,
      });
      await tx.plan.update({ where: { id: current.id }, data: { isActive: false, isDefault: false } });
      return next;
    });
  }

  /**
   * Every subscription that has ever referenced the plan, in any status — as its plan or
   * as a scheduled downgrade target. Non-zero means the plan must be archived, not deleted.
   */
  async countSubscriptionHistory(planId: string): Promise<number> {
    return this.prisma.subscription.count({
      where: { OR: [{ planId }, { scheduledPlanId: planId }] },
    });
  }

  /**
   * Takes the plan off sale (isActive=false) and stamps archivedAt.
   * deletedAt is left alone, so findById and subscription.plan keep resolving for
   * existing subscribers (renewals, usage limits, billing page).
   */
  async archive(id: string): Promise<Plan> {
    return this.prisma.plan.update({
      where: { id },
      data: { archivedAt: new Date(), isActive: false },
    });
  }

  /** Clears archivedAt only; the plan stays inactive until an admin activates it again. */
  async unarchive(id: string): Promise<Plan> {
    return this.prisma.plan.update({ where: { id }, data: { archivedAt: null } });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.plan.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
