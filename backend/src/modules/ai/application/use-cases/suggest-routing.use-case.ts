import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AiProviderService } from '../../domain/services/ai-provider.service';
import { OrgContextService } from '../../domain/services/org-context.service';

export interface RoutingSuggestion {
  suggestedTeam: string | null;
  reason: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  tags: string[];
}

@Injectable()
export class SuggestRoutingUseCase {
  constructor(
    private readonly aiProvider: AiProviderService,
    private readonly orgContext: OrgContextService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(conversationId: string, orgId: string): Promise<RoutingSuggestion> {
    // Fetch conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, orgId },
    });

    if (!conversation) {
      return { suggestedTeam: null, reason: 'Conversation not found', urgency: 'LOW', tags: [] };
    }

    // Fetch last 10 messages separately (Conversation has messages[] relation)
    const messages = await this.prisma.message.findMany({
      where: { conversationId, orgId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { body: true, direction: true },
    });

    // Fetch available teams for this org
    const teams = await this.prisma.team.findMany({
      where: { orgId },
      select: { name: true },
    });

    const teamNames = teams.map((t) => t.name);
    const ctx = await this.orgContext.getContext(orgId);

    const messagesText = messages
      .slice()
      .reverse()
      .map((m) => `[${m.direction === 'INBOUND' ? 'Customer' : 'Agent'}]: ${m.body ?? ''}`)
      .join('\n') || 'No messages yet.';

    const systemPrompt = [
      ctx ? `${ctx}\n\n---\n\n` : '',
      'You are a customer support routing assistant. Analyze the conversation and return routing advice as valid JSON.',
      teamNames.length > 0
        ? `\nAvailable teams: ${teamNames.join(', ')}.`
        : '\nNo specific teams defined.',
      '\nReturn ONLY this JSON structure (no extra text):',
      '{"suggestedTeam": "<team name or null>", "reason": "<one sentence>", "urgency": "<LOW|MEDIUM|HIGH|CRITICAL>", "tags": ["<tag1>", "<tag2>"]}',
    ]
      .filter(Boolean)
      .join('');

    const result = await this.aiProvider.complete({
      systemPrompt,
      userPrompt: `Conversation:\n${messagesText}`,
      maxTokens: 256,
    });

    try {
      const match = result.text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as Partial<RoutingSuggestion>;
        const validUrgencies = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
        return {
          suggestedTeam: typeof parsed.suggestedTeam === 'string' ? parsed.suggestedTeam : null,
          reason: typeof parsed.reason === 'string' ? parsed.reason : '',
          urgency: validUrgencies.includes(parsed.urgency as any)
            ? (parsed.urgency as RoutingSuggestion['urgency'])
            : 'LOW',
          tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t) => typeof t === 'string') : [],
        };
      }
    } catch {
      // fallback below
    }

    return {
      suggestedTeam: teamNames[0] ?? null,
      reason: result.text.trim().slice(0, 200),
      urgency: 'LOW',
      tags: [],
    };
  }
}
