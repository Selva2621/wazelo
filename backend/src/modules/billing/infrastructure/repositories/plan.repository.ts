import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Plan, BillingCycle, Prisma } from '@prisma/client';

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
        ...(data.softLimitPercent !== undefined && { softLimitPercent: data.softLimitPercent }),
        ...(data.gracePeriodDays !== undefined && { gracePeriodDays: data.gracePeriodDays }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.plan.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
