import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateAlertRuleInput {
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  windowSeconds: number;
  channels: string[];
  channelConfig: Record<string, unknown>;
  enabled?: boolean;
  cooldownSeconds?: number;
}

export interface CreateAlertEventInput {
  alertRuleId: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  channels: string[];
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AlertsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRule(data: CreateAlertRuleInput) {
    return this.prisma.alertRule.create({
      data: {
        name: data.name,
        metric: data.metric,
        condition: data.condition,
        threshold: data.threshold,
        windowSeconds: data.windowSeconds,
        channels: data.channels as Prisma.InputJsonValue,
        channelConfig: data.channelConfig as Prisma.InputJsonValue,
        enabled: data.enabled ?? true,
        cooldownSeconds: data.cooldownSeconds ?? 300,
      },
    });
  }

  async findActiveRules() {
    return this.prisma.alertRule.findMany({
      where: { enabled: true },
    });
  }

  async findRuleById(id: string) {
    return this.prisma.alertRule.findUnique({ where: { id } });
  }

  async updateRuleLastTriggered(id: string) {
    return this.prisma.alertRule.update({
      where: { id },
      data: { lastTriggeredAt: new Date() },
    });
  }

  async createAlertEvent(data: CreateAlertEventInput) {
    return this.prisma.alertEvent.create({
      data: {
        alertRuleId: data.alertRuleId,
        metric: data.metric,
        value: data.value,
        threshold: data.threshold,
        message: data.message,
        channels: data.channels as Prisma.InputJsonValue,
        metadata: (data.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }

  async getRecentAlerts(limit: number = 50, offset: number = 0) {
    const [data, total] = await Promise.all([
      this.prisma.alertEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { alertRule: { select: { name: true, metric: true } } },
      }),
      this.prisma.alertEvent.count(),
    ]);
    return { data, total };
  }

  async getAllRules() {
    return this.prisma.alertRule.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { alerts: true } } },
    });
  }
}
