import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AiProviderService } from '../../domain/services/ai-provider.service';
import { OrgContextService } from '../../domain/services/org-context.service';

export interface AiInsightsResult {
  summary: string;
  highlights: string[];
  warnings: string[];
  period: '7d' | '30d';
  generatedAt: string;
}

@Injectable()
export class GenerateAiInsightsUseCase {
  constructor(
    private readonly aiProvider: AiProviderService,
    private readonly orgContext: OrgContextService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(orgId: string, period: '7d' | '30d' = '7d'): Promise<AiInsightsResult> {
    const days = period === '30d' ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Gather compact stats from DB
    const [totalConversations, closedConversations, totalMessages, topLabels] = await Promise.all([
      this.prisma.conversation.count({ where: { orgId, createdAt: { gte: since } } }),
      this.prisma.conversation.count({ where: { orgId, status: 'CLOSED', updatedAt: { gte: since } } }),
      this.prisma.message.count({ where: { orgId, createdAt: { gte: since } } }),
      this.prisma.conversation.groupBy({
        by: ['status'],
        where: { orgId, createdAt: { gte: since } },
        _count: { _all: true },
      }),
    ]);

    const openConversations = totalConversations - closedConversations;
    const closedRate = totalConversations > 0 ? Math.round((closedConversations / totalConversations) * 100) : 0;

    const statsText = [
      `Period: last ${days} days`,
      `Total conversations started: ${totalConversations}`,
      `Conversations closed: ${closedConversations} (${closedRate}% resolution rate)`,
      `Conversations still open: ${openConversations}`,
      `Total messages exchanged: ${totalMessages}`,
      topLabels.length > 0
        ? `Conversation status breakdown: ${topLabels.map((l) => `${l.status}: ${l._count._all}`).join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const ctx = await this.orgContext.getContext(orgId);

    const systemPrompt = [
      ctx ? `${ctx}\n\n---\n\n` : '',
      'You are a customer support analytics expert. Based on the stats provided, generate actionable insights.',
      '\nReturn ONLY this JSON structure (no extra text):',
      '{"summary": "<2-3 sentence overview>", "highlights": ["<positive insight 1>", "<positive insight 2>"], "warnings": ["<concern or risk 1>"]}',
    ]
      .filter(Boolean)
      .join('');

    const result = await this.aiProvider.complete({
      systemPrompt,
      userPrompt: `Here are the support stats:\n\n${statsText}\n\nGenerate insights.`,
      maxTokens: 400,
    });

    try {
      const match = result.text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as Partial<AiInsightsResult>;
        return {
          summary: typeof parsed.summary === 'string' ? parsed.summary : result.text.trim(),
          highlights: Array.isArray(parsed.highlights)
            ? parsed.highlights.filter((h) => typeof h === 'string')
            : [],
          warnings: Array.isArray(parsed.warnings)
            ? parsed.warnings.filter((w) => typeof w === 'string')
            : [],
          period,
          generatedAt: new Date().toISOString(),
        };
      }
    } catch {
      // fallback
    }

    return {
      summary: result.text.trim(),
      highlights: [],
      warnings: [],
      period,
      generatedAt: new Date().toISOString(),
    };
  }
}
