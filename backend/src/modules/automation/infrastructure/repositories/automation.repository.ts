import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import {
  AutomationRule,
  AutomationAction,
  AutomationExecutionLog,
  AutomationRuleStatus,
  AutomationTriggerType,
  AutomationExecutionStatus,
  Prisma,
} from '@prisma/client';

export interface CreateAutomationRuleInput {
  orgId: string;
  name: string;
  description?: string;
  triggerType: AutomationTriggerType;
  triggerConfig: Prisma.InputJsonValue;
  conditions?: Prisma.InputJsonValue;
  priority?: number;
  maxExecutionsPerContact?: number;
  cooldownSeconds?: number;
  createdById: string;
  productId?: string;
}

export interface CreateAutomationActionInput {
  ruleId: string;
  orgId: string;
  actionType: string;
  actionConfig: Prisma.InputJsonValue;
  orderIndex: number;
  delaySeconds?: number;
}

export interface ListRulesOptions {
  orgId: string;
  triggerType?: AutomationTriggerType;
  status?: AutomationRuleStatus;
  limit: number;
  offset: number;
}

export interface ListExecutionLogsOptions {
  orgId: string;
  ruleId?: string;
  status?: AutomationExecutionStatus;
  limit: number;
  offset: number;
}

export type AutomationRuleWithActions = AutomationRule & {
  actions: AutomationAction[];
};

@Injectable()
export class AutomationRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Rule CRUD ─────────────────────────────

  async createRule(
    input: CreateAutomationRuleInput,
    actions: Omit<CreateAutomationActionInput, 'ruleId' | 'orgId'>[],
  ): Promise<AutomationRuleWithActions> {
    return this.prisma.automationRule.create({
      data: {
        orgId: input.orgId,
        name: input.name,
        description: input.description,
        triggerType: input.triggerType,
        triggerConfig: input.triggerConfig,
        conditions: input.conditions || Prisma.DbNull,
        priority: input.priority ?? 0,
        maxExecutionsPerContact: input.maxExecutionsPerContact ?? 0,
        cooldownSeconds: input.cooldownSeconds ?? 0,
        createdById: input.createdById,
        productId: input.productId ?? null,
        actions: {
          create: actions.map((a, idx) => ({
            orgId: input.orgId,
            actionType: a.actionType as any,
            actionConfig: a.actionConfig,
            orderIndex: a.orderIndex ?? idx,
            delaySeconds: a.delaySeconds ?? 0,
          })),
        },
      },
      include: { actions: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async findRuleByIdAndOrg(
    id: string,
    orgId: string,
  ): Promise<AutomationRuleWithActions | null> {
    return this.prisma.automationRule.findFirst({
      where: { id, orgId, deletedAt: null },
      include: { actions: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async listRules(
    options: ListRulesOptions,
  ): Promise<{ data: AutomationRuleWithActions[]; total: number }> {
    const where: Prisma.AutomationRuleWhereInput = {
      orgId: options.orgId,
      deletedAt: null,
      ...(options.triggerType && { triggerType: options.triggerType }),
      ...(options.status && { status: options.status }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.automationRule.findMany({
        where,
        include: { actions: { orderBy: { orderIndex: 'asc' } } },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: options.limit,
        skip: options.offset,
      }),
      this.prisma.automationRule.count({ where }),
    ]);

    return { data, total };
  }

  async updateRule(
    id: string,
    orgId: string,
    data: Prisma.AutomationRuleUpdateManyMutationInput,
  ): Promise<AutomationRuleWithActions | null> {
    const result = await this.prisma.automationRule.updateMany({
      where: { id, orgId, deletedAt: null },
      data,
    });

    if (result.count === 0) return null;
    return this.findRuleByIdAndOrg(id, orgId);
  }

  async replaceActions(
    ruleId: string,
    orgId: string,
    actions: Omit<CreateAutomationActionInput, 'ruleId' | 'orgId'>[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.automationAction.deleteMany({
        where: { ruleId, orgId },
      }),
      this.prisma.automationAction.createMany({
        data: actions.map((a, idx) => ({
          ruleId,
          orgId,
          actionType: a.actionType as any,
          actionConfig: a.actionConfig as any,
          orderIndex: a.orderIndex ?? idx,
          delaySeconds: a.delaySeconds ?? 0,
        })),
      }),
    ]);
  }

  async transitionStatus(
    id: string,
    orgId: string,
    expectedStatus: AutomationRuleStatus,
    newStatus: AutomationRuleStatus,
  ): Promise<AutomationRuleWithActions | null> {
    const result = await this.prisma.automationRule.updateMany({
      where: { id, orgId, status: expectedStatus, deletedAt: null },
      data: { status: newStatus },
    });

    if (result.count === 0) return null;
    return this.findRuleByIdAndOrg(id, orgId);
  }

  async softDelete(id: string, orgId: string): Promise<void> {
    await this.prisma.automationRule.updateMany({
      where: { id, orgId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async countByOrg(orgId: string): Promise<number> {
    return this.prisma.automationRule.count({
      where: { orgId, deletedAt: null },
    });
  }

  // ─── Trigger Matching ─────────────────────

  async findActiveRulesByTriggerType(
    orgId: string,
    triggerType: AutomationTriggerType,
  ): Promise<AutomationRuleWithActions[]> {
    return this.prisma.automationRule.findMany({
      where: {
        orgId,
        triggerType,
        status: AutomationRuleStatus.ACTIVE,
        deletedAt: null,
      },
      include: { actions: { orderBy: { orderIndex: 'asc' } } },
      orderBy: { priority: 'desc' },
    });
  }

  async incrementExecutionCount(id: string): Promise<void> {
    await this.prisma.automationRule.update({
      where: { id },
      data: {
        executionCount: { increment: 1 },
        lastTriggeredAt: new Date(),
      },
    });
  }

  // ─── Execution Logs ───────────────────────

  async createExecutionLog(data: {
    ruleId: string;
    orgId: string;
    contactId?: string;
    triggerEventType: string;
    triggerPayload: Prisma.InputJsonValue;
    idempotencyKey?: string;
  }): Promise<AutomationExecutionLog> {
    return this.prisma.automationExecutionLog.create({
      data: {
        ...data,
        status: AutomationExecutionStatus.PENDING,
      },
    });
  }

  async findExecutionByIdempotencyKey(
    key: string,
  ): Promise<AutomationExecutionLog | null> {
    return this.prisma.automationExecutionLog.findUnique({
      where: { idempotencyKey: key },
    });
  }

  async updateExecutionLog(
    id: string,
    data: Prisma.AutomationExecutionLogUpdateInput,
  ): Promise<AutomationExecutionLog> {
    return this.prisma.automationExecutionLog.update({
      where: { id },
      data,
    });
  }

  async listExecutionLogs(
    options: ListExecutionLogsOptions,
  ): Promise<{ data: (AutomationExecutionLog & { rule: { name: string; triggerType: AutomationTriggerType } })[]; total: number }> {
    const where: Prisma.AutomationExecutionLogWhereInput = {
      orgId: options.orgId,
      ...(options.ruleId && { ruleId: options.ruleId }),
      ...(options.status && { status: options.status }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.automationExecutionLog.findMany({
        where,
        include: {
          rule: { select: { name: true, triggerType: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: options.limit,
        skip: options.offset,
      }),
      this.prisma.automationExecutionLog.count({ where }),
    ]);

    return { data, total };
  }

  async getExecutionCountForContactRule(
    ruleId: string,
    contactId: string,
  ): Promise<number> {
    return this.prisma.automationExecutionLog.count({
      where: {
        ruleId,
        contactId,
        status: { in: [AutomationExecutionStatus.COMPLETED, AutomationExecutionStatus.RUNNING] },
      },
    });
  }

  async getLastExecutionForContactRule(
    ruleId: string,
    contactId: string,
  ): Promise<AutomationExecutionLog | null> {
    return this.prisma.automationExecutionLog.findFirst({
      where: {
        ruleId,
        contactId,
        status: AutomationExecutionStatus.COMPLETED,
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  async findExecutionTriggerPayload(
    executionId: string,
  ): Promise<Record<string, unknown> | null> {
    const log = await this.prisma.automationExecutionLog.findUnique({
      where: { id: executionId },
      select: { triggerPayload: true },
    });
    return (log?.triggerPayload as Record<string, unknown> | null) ?? null;
  }
}
