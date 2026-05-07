import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class CsatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    orgId: string;
    conversationId: string;
    contactPhone: string;
    agentId: string;
    channelType?: string;
  }) {
    const existing = await this.prisma.csatSurvey.findFirst({
      where: { conversationId: data.conversationId },
    });
    if (existing) {
      return this.prisma.csatSurvey.update({
        where: { id: existing.id },
        data: { agentId: data.agentId, sentAt: new Date() },
      });
    }
    return this.prisma.csatSurvey.create({ data });
  }

  async submitResponse(conversationId: string, rating: number, comment?: string) {
    return this.prisma.csatSurvey.update({
      where: { conversationId },
      data: { rating, comment, respondedAt: new Date() },
    });
  }

  async findByConversation(conversationId: string) {
    return this.prisma.csatSurvey.findUnique({
      where: { conversationId },
    });
  }

  async getStats(orgId: string, startDate?: Date, endDate?: Date, productId?: string) {
    const where: Record<string, unknown> = {
      orgId,
      rating: { not: null },
      ...(productId && { productId }),
    };
    if (startDate || endDate) {
      where.sentAt = {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      };
    }

    const [stats, byAgent, distribution] = await Promise.all([
      this.prisma.csatSurvey.aggregate({
        where: where as any,
        _avg: { rating: true },
        _count: { rating: true },
      }),
      this.prisma.csatSurvey.groupBy({
        by: ['agentId'],
        where: where as any,
        _avg: { rating: true },
        _count: { rating: true },
      }),
      this.prisma.csatSurvey.groupBy({
        by: ['rating'],
        where: where as any,
        _count: { rating: true },
      }),
    ]);

    return {
      avgRating: stats._avg.rating ?? 0,
      totalResponses: stats._count.rating,
      byAgent,
      distribution: distribution.map((d: { rating: number | null; _count: { rating: number } }) => ({
        rating: d.rating,
        count: d._count.rating,
      })),
    };
  }

  async list(orgId: string, params?: { take?: number; skip?: number; agentId?: string }) {
    const where: Record<string, unknown> = { orgId };
    if (params?.agentId) where.agentId = params.agentId;

    const [data, total] = await Promise.all([
      this.prisma.csatSurvey.findMany({
        where: where as any,
        orderBy: { sentAt: 'desc' },
        take: params?.take ?? 20,
        skip: params?.skip ?? 0,
      }),
      this.prisma.csatSurvey.count({ where: where as any }),
    ]);

    return { data, total };
  }
}
