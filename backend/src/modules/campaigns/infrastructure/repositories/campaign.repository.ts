import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import {
  Campaign,
  CampaignStatus,
  Prisma,
} from '@prisma/client';

export interface CreateCampaignInput {
  orgId: string;
  sessionId: string;
  name: string;
  description?: string;
  messageType: string;
  messageBody?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  audienceType: string;
  audienceFilters?: Record<string, unknown>;
  scheduledAt?: Date;
  timezone?: string;
  createdById: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  productId?: string;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  messageType?: string;
  messageBody?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  audienceType?: string;
  audienceFilters?: Record<string, unknown>;
  sessionId?: string;
  scheduledAt?: Date;
  timezone?: string;
}

export interface ListCampaignsOptions {
  take?: number;
  skip?: number;
  status?: CampaignStatus;
  sortBy?: 'createdAt' | 'updatedAt' | 'scheduledAt';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class CampaignRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCampaignInput): Promise<Campaign> {
    return this.prisma.campaign.create({
      data: {
        orgId: input.orgId,
        sessionId: input.sessionId,
        name: input.name,
        description: input.description || null,
        messageType: input.messageType as any,
        messageBody: input.messageBody || null,
        mediaUrl: input.mediaUrl || null,
        mediaMimeType: input.mediaMimeType || null,
        audienceType: input.audienceType as any,
        audienceFilters: (input.audienceFilters as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        scheduledAt: input.scheduledAt || null,
        timezone: input.timezone || 'UTC',
        createdById: input.createdById,
        idempotencyKey: input.idempotencyKey || null,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        productId: input.productId ?? null,
      },
    });
  }

  async findById(id: string): Promise<Campaign | null> {
    return this.prisma.campaign.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByIdAndOrg(id: string, orgId: string): Promise<Campaign | null> {
    return this.prisma.campaign.findFirst({
      where: { id, orgId, deletedAt: null },
    });
  }

  async findByIdempotencyKey(key: string): Promise<Campaign | null> {
    return this.prisma.campaign.findUnique({
      where: { idempotencyKey: key },
    });
  }

  async findByOrgPaginated(
    orgId: string,
    options: ListCampaignsOptions = {},
  ): Promise<{ campaigns: Campaign[]; total: number }> {
    const where: Prisma.CampaignWhereInput = {
      orgId,
      deletedAt: null,
      ...(options.status && { status: options.status }),
    };

    const orderBy: Prisma.CampaignOrderByWithRelationInput = {
      [options.sortBy ?? 'createdAt']: options.sortOrder ?? 'desc',
    };

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        take: options.take ?? 20,
        skip: options.skip ?? 0,
        orderBy,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { campaigns, total };
  }

  async updateDraft(
    id: string,
    orgId: string,
    data: UpdateCampaignInput,
  ): Promise<Campaign | null> {
    const result = await this.prisma.campaign.updateMany({
      where: { id, orgId, status: CampaignStatus.DRAFT, deletedAt: null },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.messageType !== undefined && { messageType: data.messageType as any }),
        ...(data.messageBody !== undefined && { messageBody: data.messageBody }),
        ...(data.mediaUrl !== undefined && { mediaUrl: data.mediaUrl }),
        ...(data.mediaMimeType !== undefined && { mediaMimeType: data.mediaMimeType }),
        ...(data.audienceType !== undefined && { audienceType: data.audienceType as any }),
        ...(data.audienceFilters !== undefined && {
          audienceFilters: data.audienceFilters as Prisma.InputJsonValue,
        }),
        ...(data.sessionId !== undefined && { sessionId: data.sessionId }),
        ...(data.scheduledAt !== undefined && { scheduledAt: data.scheduledAt }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
      },
    });

    if (result.count === 0) return null;
    return this.findById(id);
  }

  /**
   * Atomically transition campaign status.
   * Uses optimistic concurrency: only updates if current status matches expected.
   */
  async transitionStatus(
    id: string,
    expectedStatus: CampaignStatus,
    newStatus: CampaignStatus,
    extra?: Record<string, unknown>,
  ): Promise<Campaign | null> {
    const result = await this.prisma.campaign.updateMany({
      where: { id, status: expectedStatus, deletedAt: null },
      data: {
        status: newStatus,
        ...extra,
      },
    });

    if (result.count === 0) return null;
    return this.findById(id);
  }

  /**
   * Atomic increment of campaign counter fields.
   */
  async incrementCounter(
    id: string,
    field: 'sentCount' | 'deliveredCount' | 'failedCount' | 'readCount',
    amount: number = 1,
  ): Promise<void> {
    await this.prisma.campaign.update({
      where: { id },
      data: { [field]: { increment: amount } },
    });
  }

  async updateTotalRecipients(id: string, total: number): Promise<void> {
    await this.prisma.campaign.update({
      where: { id },
      data: { totalRecipients: total },
    });
  }

  async findScheduledCampaigns(beforeTime: Date): Promise<Campaign[]> {
    return this.prisma.campaign.findMany({
      where: {
        status: CampaignStatus.SCHEDULED,
        scheduledAt: { lte: beforeTime },
        deletedAt: null,
      },
    });
  }

  async findRunningCampaigns(): Promise<Campaign[]> {
    return this.prisma.campaign.findMany({
      where: {
        status: CampaignStatus.RUNNING,
        deletedAt: null,
      },
    });
  }

  async recordEvent(data: {
    campaignId: string;
    orgId: string;
    previousStatus?: CampaignStatus;
    newStatus: CampaignStatus;
    triggeredById?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.campaignEvent.create({
      data: {
        campaignId: data.campaignId,
        orgId: data.orgId,
        previousStatus: data.previousStatus || null,
        newStatus: data.newStatus,
        triggeredById: data.triggeredById || null,
        metadata: (data.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }

  async softDelete(id: string, orgId: string): Promise<void> {
    await this.prisma.campaign.updateMany({
      where: { id, orgId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
