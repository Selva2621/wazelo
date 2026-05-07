import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class LeadScoringRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ─── Scoring Rules ─── */

  async createRule(data: {
    orgId: string;
    name: string;
    description?: string;
    signal: string;
    condition?: Record<string, unknown>;
    points: number;
    maxPerContact?: number;
  }) {
    return this.prisma.leadScoringRule.create({ data: data as any });
  }

  async findRulesByOrg(orgId: string) {
    return this.prisma.leadScoringRule.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findEnabledRulesBySignal(orgId: string, signal: string) {
    return this.prisma.leadScoringRule.findMany({
      where: { orgId, signal, enabled: true },
    });
  }

  async findRuleById(id: string, orgId: string) {
    return this.prisma.leadScoringRule.findFirst({
      where: { id, orgId },
    });
  }

  async updateRule(id: string, orgId: string, data: Partial<{
    name: string;
    description: string | null;
    signal: string;
    condition: Record<string, unknown> | null;
    points: number;
    maxPerContact: number;
    enabled: boolean;
  }>) {
    return this.prisma.leadScoringRule.updateMany({
      where: { id, orgId },
      data: data as any,
    });
  }

  async deleteRule(id: string, orgId: string) {
    return this.prisma.leadScoringRule.deleteMany({
      where: { id, orgId },
    });
  }

  /* ─── Score History ─── */

  async createScoreEntry(data: {
    contactId: string;
    orgId: string;
    previousScore: number;
    newScore: number;
    delta: number;
    reason: string;
    ruleId?: string;
  }) {
    return this.prisma.contactScoreHistory.create({ data });
  }

  async findScoreHistory(contactId: string, orgId: string, take = 20, skip = 0) {
    const [data, total] = await Promise.all([
      this.prisma.contactScoreHistory.findMany({
        where: { contactId, orgId },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.contactScoreHistory.count({ where: { contactId, orgId } }),
    ]);
    return { data, total };
  }

  /** Count how many times a specific rule has fired for a contact. */
  async countRuleApplications(contactId: string, ruleId: string): Promise<number> {
    return this.prisma.contactScoreHistory.count({
      where: { contactId, ruleId },
    });
  }

  /* ─── Contact Score Updates ─── */

  async updateContactScore(contactId: string, orgId: string, newScore: number) {
    return this.prisma.contact.updateMany({
      where: { id: contactId, orgId },
      data: { leadScore: newScore, scoreUpdatedAt: new Date() },
    });
  }

  async getContactScore(contactId: string, orgId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, orgId, deletedAt: null },
      select: { id: true, leadScore: true, scoreUpdatedAt: true },
    });
    return contact;
  }
}
