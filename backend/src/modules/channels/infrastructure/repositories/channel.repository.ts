import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import {
  ChannelType,
  ChannelStatus,
  Prisma,
} from '@prisma/client';

export interface ChannelFilters {
  type?: ChannelType;
  status?: ChannelStatus;
}

@Injectable()
export class ChannelRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ChannelCreateInput) {
    return this.prisma.channel.create({ data });
  }

  async findById(id: string) {
    return this.prisma.channel.findUnique({ where: { id } });
  }

  async findByIdAndOrg(id: string, orgId: string) {
    return this.prisma.channel.findFirst({
      where: { id, orgId, deletedAt: null },
    });
  }

  async findByLegacySessionId(legacySessionId: string) {
    return this.prisma.channel.findFirst({
      where: { legacySessionId, deletedAt: null },
    });
  }

  async findByOrgAndHandle(
    orgId: string,
    type: ChannelType,
    externalHandle: string,
  ) {
    return this.prisma.channel.findFirst({
      where: { orgId, type, externalHandle, deletedAt: null },
    });
  }

  async listByOrg(orgId: string, filters?: ChannelFilters) {
    return this.prisma.channel.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(filters?.type && { type: filters.type }),
        ...(filters?.status && { status: filters.status }),
      },
      select: {
        id: true,
        type: true,
        name: true,
        status: true,
        externalId: true,
        externalHandle: true,
        capabilities: true,
        rateLimitPerMin: true,
        rateLimitBurst: true,
        verifiedAt: true,
        lastActiveAt: true,
        lastErrorAt: true,
        lastError: true,
        suspendedAt: true,
        suspendReason: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        // Never expose encryptedConfig, webhookSecret
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countByOrg(orgId: string) {
    return this.prisma.channel.count({
      where: { orgId, deletedAt: null },
    });
  }

  async update(id: string, data: Prisma.ChannelUpdateInput) {
    return this.prisma.channel.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.channel.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: ChannelStatus.DISCONNECTED,
      },
    });
  }

  async countActiveConversations(channelId: string) {
    return this.prisma.conversation.count({
      where: {
        channelId,
        status: 'OPEN',
        deletedAt: null,
      },
    });
  }

  async upsertRateLimit(
    channelId: string,
    orgId: string,
    windowStart: Date,
  ): Promise<number> {
    const result = await this.prisma.channelRateLimit.upsert({
      where: {
        unique_rate_window: { channelId, windowStart },
      },
      create: {
        channelId,
        orgId,
        windowStart,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });
    return result.count;
  }

  async getRateLimitCount(
    channelId: string,
    windowStart: Date,
  ): Promise<number> {
    const record = await this.prisma.channelRateLimit.findUnique({
      where: {
        unique_rate_window: { channelId, windowStart },
      },
    });
    return record?.count || 0;
  }
}
