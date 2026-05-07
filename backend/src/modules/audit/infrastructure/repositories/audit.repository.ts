import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AuditAction, AuditLog, Prisma } from '@prisma/client';

export interface CreateAuditLogInput {
  orgId?: string;
  userId?: string;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  traceId?: string;
  source?: string;
  duration?: number;
}

@Injectable()
export class AuditRepository {
  private readonly logger = new Logger(AuditRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAuditLogInput): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        orgId: data.orgId,
        userId: data.userId,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        metadata: (data.metadata as Prisma.InputJsonValue) ?? undefined,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        traceId: data.traceId,
        source: data.source,
        duration: data.duration,
      },
    });
  }

  /**
   * Batch insert audit logs for buffered writes.
   * Uses createMany for maximum throughput under high load.
   */
  async createMany(data: CreateAuditLogInput[]): Promise<number> {
    const result = await this.prisma.auditLog.createMany({
      data: data.map((d) => ({
        orgId: d.orgId,
        userId: d.userId,
        action: d.action,
        targetType: d.targetType,
        targetId: d.targetId,
        metadata: (d.metadata as Prisma.InputJsonValue) ?? undefined,
        ipAddress: d.ipAddress,
        userAgent: d.userAgent,
        traceId: d.traceId,
        source: d.source,
        duration: d.duration,
      })),
      skipDuplicates: true,
    });
    return result.count;
  }

  /**
   * Get audit log statistics for a given org and time range.
   */
  async getStats(
    orgId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ action: AuditAction; count: number }[]> {
    const results = await this.prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        orgId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return results.map((r) => ({
      action: r.action,
      count: r._count.id,
    }));
  }

  async findByOrgId(
    orgId: string,
    options?: { take?: number; skip?: number },
  ): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: options?.take ?? 50,
      skip: options?.skip ?? 0,
    });
  }

  /**
   * Query audit logs with filters (EPIC 8 — AC2: Searchable logs).
   */
  async query(
    orgId: string,
    filters: {
      action?: AuditAction;
      userId?: string;
      targetType?: string;
      targetId?: string;
      traceId?: string;
      source?: string;
      startDate?: Date;
      endDate?: Date;
    },
    pagination: { take: number; skip: number },
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {
      orgId,
      ...(filters.action && { action: filters.action }),
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.targetType && { targetType: filters.targetType }),
      ...(filters.targetId && { targetId: filters.targetId }),
      ...(filters.traceId && { traceId: filters.traceId }),
      ...(filters.source && { source: filters.source }),
      ...(filters.startDate || filters.endDate
        ? {
            createdAt: {
              ...(filters.startDate && { gte: filters.startDate }),
              ...(filters.endDate && { lte: filters.endDate }),
            },
          }
        : {}),
    };

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: pagination.take,
        skip: pagination.skip,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }
}
