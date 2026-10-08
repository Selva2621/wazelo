import { Injectable } from '@nestjs/common';
import { PlatformActorType, PlatformAuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export interface CreatePlatformAuditInput {
  actorType: PlatformActorType;
  actorId?: string | null;
  actorEmail?: string | null;
  action: PlatformAuditAction;
  targetType?: string | null;
  targetId?: string | null;
  orgId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface PlatformAuditQuery {
  skip: number;
  take: number;
  action?: PlatformAuditAction;
  actorId?: string;
  orgId?: string;
  targetType?: string;
  targetId?: string;
  from?: Date;
  to?: Date;
}

/** Append-only: there is intentionally no update or delete. */
@Injectable()
export class PlatformAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreatePlatformAuditInput): Promise<void> {
    await this.prisma.platformAuditLog.create({
      data: {
        ...input,
        userAgent: input.userAgent?.slice(0, 512) ?? null,
      },
    });
  }

  async findMany(query: PlatformAuditQuery) {
    const where: Prisma.PlatformAuditLogWhereInput = {
      ...(query.action && { action: query.action }),
      ...(query.actorId && { actorId: query.actorId }),
      ...(query.orgId && { orgId: query.orgId }),
      ...(query.targetType && { targetType: query.targetType }),
      ...(query.targetId && { targetId: query.targetId }),
      ...((query.from || query.to) && {
        createdAt: { ...(query.from && { gte: query.from }), ...(query.to && { lte: query.to }) },
      }),
    };
    const [items, total] = await Promise.all([
      this.prisma.platformAuditLog.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.platformAuditLog.count({ where }),
    ]);
    return { items, total };
  }
}
