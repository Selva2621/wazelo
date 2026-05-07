import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';

export interface ListLeadAdEntriesParams {
  orgId: string;
  status?: string;
  platform?: string;
  campaignName?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  take?: number;
  skip?: number;
}

@Injectable()
export class LeadAdRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.LeadAdEntryUncheckedCreateInput) {
    return this.prisma.leadAdEntry.create({ data });
  }

  async findById(id: string) {
    return this.prisma.leadAdEntry.findUnique({ where: { id } });
  }

  async findByLeadgenId(orgId: string, leadgenId: string) {
    return this.prisma.leadAdEntry.findUnique({
      where: { unique_lead_per_org: { orgId, leadgenId } },
    });
  }

  async update(id: string, data: Prisma.LeadAdEntryUpdateInput) {
    return this.prisma.leadAdEntry.update({ where: { id }, data });
  }

  async list(params: ListLeadAdEntriesParams) {
    const where: Prisma.LeadAdEntryWhereInput = {
      orgId: params.orgId,
      ...(params.status && { status: params.status }),
      ...(params.platform && { platform: params.platform }),
      ...(params.campaignName && {
        campaignName: { contains: params.campaignName, mode: 'insensitive' as const },
      }),
      ...(params.search && {
        OR: [
          { adName: { contains: params.search, mode: 'insensitive' as const } },
          { campaignName: { contains: params.search, mode: 'insensitive' as const } },
          { leadgenId: { contains: params.search } },
        ],
      }),
      ...(params.startDate && { createdAt: { gte: params.startDate } }),
      ...(params.endDate && { createdAt: { lte: params.endDate } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.leadAdEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.take || 20,
        skip: params.skip || 0,
      }),
      this.prisma.leadAdEntry.count({ where }),
    ]);

    return { data, total, take: params.take || 20, skip: params.skip || 0 };
  }

  async countByOrgAndPlatform(orgId: string, startDate?: Date, endDate?: Date) {
    const where: Prisma.LeadAdEntryWhereInput = {
      orgId,
      status: 'COMPLETED',
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
    };

    return this.prisma.leadAdEntry.groupBy({
      by: ['platform'],
      where,
      _count: { id: true },
    });
  }

  async countByOrgAndCampaign(orgId: string, startDate?: Date, endDate?: Date) {
    const where: Prisma.LeadAdEntryWhereInput = {
      orgId,
      status: 'COMPLETED',
      campaignName: { not: null },
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
    };

    return this.prisma.leadAdEntry.groupBy({
      by: ['campaignName'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });
  }

  async countTotal(orgId: string, startDate?: Date, endDate?: Date) {
    return this.prisma.leadAdEntry.count({
      where: {
        orgId,
        status: 'COMPLETED',
        ...(startDate && { createdAt: { gte: startDate } }),
        ...(endDate && { createdAt: { lte: endDate } }),
      },
    });
  }

  async findOrgByPageId(pageId: string): Promise<string | null> {
    // Look up which org owns this page via Channel.externalId
    const channel = await this.prisma.channel.findFirst({
      where: {
        externalId: pageId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      select: { orgId: true, id: true },
    });
    return channel?.orgId ?? null;
  }

  async findChannelByPageId(pageId: string) {
    return this.prisma.channel.findFirst({
      where: {
        externalId: pageId,
        deletedAt: null,
        status: 'ACTIVE',
      },
    });
  }

  async findChannelsByOrg(orgId: string) {
    return this.prisma.channel.findMany({
      where: {
        orgId,
        deletedAt: null,
        status: 'ACTIVE',
        type: { in: ['WHATSAPP', 'INSTAGRAM', 'FACEBOOK_MESSENGER'] },
      },
      select: {
        id: true,
        type: true,
        name: true,
        externalId: true,
        externalHandle: true,
      },
    });
  }
}
