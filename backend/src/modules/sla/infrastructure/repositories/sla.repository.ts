import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import {
  SlaPolicy,
  SlaTracking,
  SlaBreachLog,
  SlaMetricType,
  SlaPriority,
  SlaBreachStatus,
  Prisma,
} from '@prisma/client';

export interface ListPoliciesOptions {
  isActive?: boolean;
  metricType?: SlaMetricType;
  priority?: SlaPriority;
}

export interface ListTrackingsOptions {
  policyId?: string;
  conversationId?: string;
  assignedUserId?: string;
  isBreached?: boolean;
  isWarning?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit: number;
  offset: number;
}

export interface ListBreachesOptions {
  policyId?: string;
  conversationId?: string;
  assignedUserId?: string;
  status?: SlaBreachStatus;
  metricType?: SlaMetricType;
  startDate?: Date;
  endDate?: Date;
  limit: number;
  offset: number;
}

@Injectable()
export class SlaRepository {
  private readonly logger = new Logger(SlaRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Policies ───────────────────────────────

  async createPolicy(
    data: Prisma.SlaPolicyUncheckedCreateInput,
  ): Promise<SlaPolicy> {
    return this.prisma.slaPolicy.create({ data });
  }

  async findPolicyById(
    id: string,
    orgId: string,
  ): Promise<SlaPolicy | null> {
    return this.prisma.slaPolicy.findFirst({
      where: { id, orgId, deletedAt: null },
    });
  }

  async findPolicyByName(
    orgId: string,
    name: string,
  ): Promise<SlaPolicy | null> {
    return this.prisma.slaPolicy.findFirst({
      where: { orgId, name, deletedAt: null },
    });
  }

  async listPolicies(
    orgId: string,
    options: ListPoliciesOptions,
  ): Promise<SlaPolicy[]> {
    return this.prisma.slaPolicy.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(options.isActive !== undefined
          ? { isActive: options.isActive }
          : {}),
        ...(options.metricType ? { metricType: options.metricType } : {}),
        ...(options.priority ? { priority: options.priority } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countPolicies(orgId: string): Promise<number> {
    return this.prisma.slaPolicy.count({
      where: { orgId, deletedAt: null },
    });
  }

  async updatePolicy(
    id: string,
    orgId: string,
    data: Prisma.SlaPolicyUncheckedUpdateInput,
  ): Promise<SlaPolicy> {
    return this.prisma.slaPolicy.update({
      where: { id },
      data: { ...data, orgId }, // ensure org scope
    });
  }

  async softDeletePolicy(id: string, orgId: string): Promise<SlaPolicy> {
    return this.prisma.slaPolicy.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async findActivePolicies(orgId: string): Promise<SlaPolicy[]> {
    return this.prisma.slaPolicy.findMany({
      where: { orgId, isActive: true, deletedAt: null },
    });
  }

  async findActivePoliciesByMetric(
    metricType: SlaMetricType,
  ): Promise<SlaPolicy[]> {
    return this.prisma.slaPolicy.findMany({
      where: { isActive: true, deletedAt: null, metricType },
    });
  }

  async findAllActivePolicies(): Promise<SlaPolicy[]> {
    return this.prisma.slaPolicy.findMany({
      where: { isActive: true, deletedAt: null },
    });
  }

  // ─── Trackings ──────────────────────────────

  async upsertTracking(
    idempotencyKey: string,
    data: Prisma.SlaTrackingUncheckedCreateInput,
  ): Promise<SlaTracking> {
    return this.prisma.slaTracking.upsert({
      where: { idempotencyKey },
      create: data,
      update: {}, // no-op if already exists (idempotent)
    });
  }

  async findTrackingById(
    id: string,
    orgId: string,
  ): Promise<SlaTracking | null> {
    return this.prisma.slaTracking.findFirst({
      where: { id, orgId },
    });
  }

  async findActiveTrackingByConversation(
    orgId: string,
    conversationId: string,
    policyId: string,
  ): Promise<SlaTracking | null> {
    return this.prisma.slaTracking.findFirst({
      where: {
        orgId,
        conversationId,
        policyId,
        respondedAt: null,
        resolvedAt: null,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async listTrackings(
    orgId: string,
    options: ListTrackingsOptions,
  ): Promise<{ data: SlaTracking[]; total: number }> {
    const where: Prisma.SlaTrackingWhereInput = {
      orgId,
      ...(options.policyId ? { policyId: options.policyId } : {}),
      ...(options.conversationId
        ? { conversationId: options.conversationId }
        : {}),
      ...(options.assignedUserId
        ? { assignedUserId: options.assignedUserId }
        : {}),
      ...(options.isBreached !== undefined
        ? { isBreached: options.isBreached }
        : {}),
      ...(options.isWarning !== undefined
        ? { isWarning: options.isWarning }
        : {}),
      ...(options.startDate || options.endDate
        ? {
            startedAt: {
              ...(options.startDate ? { gte: options.startDate } : {}),
              ...(options.endDate ? { lte: options.endDate } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.slaTracking.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: options.limit,
        skip: options.offset,
      }),
      this.prisma.slaTracking.count({ where }),
    ]);

    return { data, total };
  }

  async updateTracking(
    id: string,
    data: Prisma.SlaTrackingUncheckedUpdateInput,
  ): Promise<SlaTracking> {
    return this.prisma.slaTracking.update({
      where: { id },
      data,
    });
  }

  async findOverdueTrackings(
    now: Date,
    batchSize: number,
  ): Promise<SlaTracking[]> {
    return this.prisma.slaTracking.findMany({
      where: {
        deadlineAt: { lte: now },
        isBreached: false,
        respondedAt: null,
        resolvedAt: null,
        pausedAt: null,
      },
      take: batchSize,
      orderBy: { deadlineAt: 'asc' },
    });
  }

  async findWarningDueTrackings(
    now: Date,
    batchSize: number,
  ): Promise<SlaTracking[]> {
    return this.prisma.slaTracking.findMany({
      where: {
        warningAt: { lte: now },
        isWarning: false,
        isBreached: false,
        respondedAt: null,
        resolvedAt: null,
        pausedAt: null,
      },
      take: batchSize,
      orderBy: { warningAt: 'asc' },
    });
  }

  // ─── Breach Logs ────────────────────────────

  async createBreach(
    data: Prisma.SlaBreachLogUncheckedCreateInput,
  ): Promise<SlaBreachLog> {
    return this.prisma.slaBreachLog.upsert({
      where: { idempotencyKey: data.idempotencyKey },
      create: data,
      update: {}, // idempotent
    });
  }

  async findBreachById(
    id: string,
    orgId: string,
  ): Promise<SlaBreachLog | null> {
    return this.prisma.slaBreachLog.findFirst({
      where: { id, orgId },
    });
  }

  async listBreaches(
    orgId: string,
    options: ListBreachesOptions,
  ): Promise<{ data: SlaBreachLog[]; total: number }> {
    const where: Prisma.SlaBreachLogWhereInput = {
      orgId,
      ...(options.policyId ? { policyId: options.policyId } : {}),
      ...(options.conversationId
        ? { conversationId: options.conversationId }
        : {}),
      ...(options.assignedUserId
        ? { assignedUserId: options.assignedUserId }
        : {}),
      ...(options.status ? { status: options.status } : {}),
      ...(options.metricType ? { metricType: options.metricType } : {}),
      ...(options.startDate || options.endDate
        ? {
            createdAt: {
              ...(options.startDate ? { gte: options.startDate } : {}),
              ...(options.endDate ? { lte: options.endDate } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.slaBreachLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit,
        skip: options.offset,
      }),
      this.prisma.slaBreachLog.count({ where }),
    ]);

    return { data, total };
  }

  async acknowledgeBreach(
    id: string,
    orgId: string,
    userId: string,
  ): Promise<SlaBreachLog> {
    return this.prisma.slaBreachLog.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      },
    });
  }

  async resolveBreach(id: string): Promise<SlaBreachLog> {
    return this.prisma.slaBreachLog.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });
  }

  async getBreachCountByPolicy(
    orgId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ policyId: string; count: number }[]> {
    const results = await this.prisma.slaBreachLog.groupBy({
      by: ['policyId'],
      where: {
        orgId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
    });
    return results.map((r) => ({
      policyId: r.policyId,
      count: r._count.id,
    }));
  }

  async getBreachCountByUser(
    orgId: string,
    startDate: Date,
    endDate: Date,
    userIds?: string[],
  ): Promise<{ assignedUserId: string; count: number }[]> {
    const results = await this.prisma.slaBreachLog.groupBy({
      by: ['assignedUserId'],
      where: {
        orgId,
        createdAt: { gte: startDate, lte: endDate },
        assignedUserId: {
          not: null,
          ...(userIds ? { in: userIds } : {}),
        },
      },
      _count: { id: true },
    });
    return results.map((r) => ({
      assignedUserId: r.assignedUserId!,
      count: r._count.id,
    }));
  }

  // ─── Performance Aggregations ───────────────

  async getSlaComplianceRate(
    orgId: string,
    startDate: Date,
    endDate: Date,
    policyId?: string,
    userIds?: string[],
  ): Promise<{ total: number; breached: number; complianceRate: number }> {
    const where: Prisma.SlaTrackingWhereInput = {
      orgId,
      startedAt: { gte: startDate, lte: endDate },
      ...(policyId ? { policyId } : {}),
      ...(userIds ? { assignedUserId: { in: userIds } } : {}),
    };

    const [total, breached] = await this.prisma.$transaction([
      this.prisma.slaTracking.count({ where }),
      this.prisma.slaTracking.count({ where: { ...where, isBreached: true } }),
    ]);

    return {
      total,
      breached,
      complianceRate: total > 0 ? ((total - breached) / total) * 100 : 100,
    };
  }

  async getAvgResponseTimeByUser(
    orgId: string,
    startDate: Date,
    endDate: Date,
    userIds?: string[],
  ): Promise<{ assignedUserId: string; avgMs: number; count: number }[]> {
    const results = await this.prisma.slaTracking.groupBy({
      by: ['assignedUserId'],
      where: {
        orgId,
        startedAt: { gte: startDate, lte: endDate },
        elapsedMs: { not: null },
        assignedUserId: {
          not: null,
          ...(userIds ? { in: userIds } : {}),
        },
      },
      _avg: { elapsedMs: true },
      _count: { id: true },
    });
    return results.map((r) => ({
      assignedUserId: r.assignedUserId!,
      avgMs: Math.round(r._avg.elapsedMs ?? 0),
      count: r._count.id,
    }));
  }
}
