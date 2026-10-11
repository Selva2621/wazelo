import { Injectable } from '@nestjs/common';
import { PlatformActorType, PlatformAuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { OrderByEntry } from '../../domain/services/list-sort';

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
  /** When the action happened — set when a buffered entry is written late */
  createdAt?: Date;
}

export interface PlatformAuditQuery {
  skip: number;
  take: number;
  action?: PlatformAuditAction;
  actorId?: string;
  orgId?: string;
  targetType?: string;
  targetId?: string;
  /** actor email, case-insensitive substring */
  search?: string;
  from?: Date;
  to?: Date;
  orderBy?: OrderByEntry[];
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

  /** Which of `targetIds` already have an entry with `action`. */
  async targetIdsWithAction(action: PlatformAuditAction, targetIds: string[]): Promise<Set<string>> {
    if (!targetIds.length) return new Set();
    const rows = await this.prisma.platformAuditLog.findMany({
      where: { action, targetId: { in: targetIds } },
      select: { targetId: true },
    });
    return new Set(rows.map((r) => r.targetId).filter((id): id is string => !!id));
  }

  async findMany(query: PlatformAuditQuery) {
    const where: Prisma.PlatformAuditLogWhereInput = {
      ...(query.action && { action: query.action }),
      ...(query.actorId && { actorId: query.actorId }),
      ...(query.orgId && { orgId: query.orgId }),
      ...(query.targetType && { targetType: query.targetType }),
      ...(query.targetId && { targetId: query.targetId }),
      ...(query.search && { actorEmail: { contains: query.search, mode: 'insensitive' } }),
      ...((query.from || query.to) && {
        createdAt: { ...(query.from && { gte: query.from }), ...(query.to && { lte: query.to }) },
      }),
    };
    const [items, total] = await Promise.all([
      this.prisma.platformAuditLog.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: (query.orderBy ?? [{ createdAt: 'desc' }, { id: 'desc' }]) as Prisma.PlatformAuditLogOrderByWithRelationInput[],
      }),
      this.prisma.platformAuditLog.count({ where }),
    ]);
    return { items, total };
  }
}
