import { Injectable } from '@nestjs/common';
import { AiReplyOutcome, Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export type AiReplyLogInput = Omit<Prisma.AiReplyLogUncheckedCreateInput, 'id' | 'createdAt'>;

export interface OutcomeCount {
  outcome: AiReplyOutcome;
  count: number;
  tokens: number;
  charged: number;
}

/** The AI reply trail (ai_reply_logs). Every query is scoped to one org. */
@Injectable()
export class AiReplyLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(entry: AiReplyLogInput): Promise<void> {
    await this.prisma.aiReplyLog.create({ data: entry });
  }

  /** How the bot did since a date, per outcome */
  async countsByOutcome(orgId: string, since: Date): Promise<OutcomeCount[]> {
    const [counts, charged] = await Promise.all([
      this.prisma.aiReplyLog.groupBy({
        by: ['outcome'],
        where: { orgId, createdAt: { gte: since } },
        _count: { _all: true },
        _sum: { tokens: true },
      }),
      this.prisma.aiReplyLog.groupBy({
        by: ['outcome'],
        where: { orgId, createdAt: { gte: since }, charged: true },
        _count: { _all: true },
      }),
    ]);
    const chargedBy = new Map(charged.map((c) => [c.outcome, c._count._all]));
    return counts.map((c) => ({
      outcome: c.outcome,
      count: c._count._all,
      tokens: c._sum.tokens ?? 0,
      charged: chargedBy.get(c.outcome) ?? 0,
    }));
  }

  /** Charged replies per channel since a date (WHATSAPP / WIDGET cost differently) */
  async chargedByChannel(orgId: string, since: Date): Promise<Record<string, number>> {
    const rows = await this.prisma.aiReplyLog.groupBy({
      by: ['channel'],
      where: { orgId, createdAt: { gte: since }, charged: true },
      _count: { _all: true },
    });
    return Object.fromEntries(rows.map((r) => [r.channel, r._count._all]));
  }

  /** Replies the safety checks stopped (blocked or over a limit), newest first */
  listSuspicious(orgId: string, since: Date, take = 20) {
    return this.prisma.aiReplyLog.findMany({
      where: { orgId, createdAt: { gte: since }, outcome: { in: [AiReplyOutcome.BLOCKED, AiReplyOutcome.LIMITED] } },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        channel: true,
        conversationId: true,
        widgetSessionId: true,
        outcome: true,
        reason: true,
        createdAt: true,
      },
    });
  }

  /** Times one conversation hit the safety checks since a date */
  countSafetyStops(orgId: string, conversationId: string, since: Date): Promise<number> {
    return this.prisma.aiReplyLog.count({
      where: {
        orgId,
        conversationId,
        createdAt: { gte: since },
        outcome: { in: [AiReplyOutcome.BLOCKED, AiReplyOutcome.LIMITED] },
      },
    });
  }

  /** Times each conversation hit the safety checks since a date (repeat offenders) */
  async suspiciousByConversation(orgId: string, since: Date): Promise<Map<string, number>> {
    const rows = await this.prisma.aiReplyLog.groupBy({
      by: ['conversationId'],
      where: {
        orgId,
        createdAt: { gte: since },
        outcome: { in: [AiReplyOutcome.BLOCKED, AiReplyOutcome.LIMITED] },
        conversationId: { not: null },
      },
      _count: { _all: true },
    });
    return new Map(rows.filter((r) => r.conversationId).map((r) => [r.conversationId as string, r._count._all]));
  }
}
