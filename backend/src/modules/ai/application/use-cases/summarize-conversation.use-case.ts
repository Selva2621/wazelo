import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AiProviderService } from '../../domain/services/ai-provider.service';

@Injectable()
export class SummarizeConversationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
  ) {}

  async execute(conversationId: string, orgId: string) {
    // Check if summary already exists and is recent (< 1 hour)
    const existing = await this.prisma.aiConversationSummary.findUnique({
      where: { conversationId },
    });

    if (existing) {
      const ageMs = Date.now() - existing.generatedAt.getTime();
      if (ageMs < 3600_000) return existing; // Return cached if < 1 hour old
    }

    // Get all messages for this conversation
    const messages = await this.prisma.message.findMany({
      where: { conversationId, orgId },
      orderBy: { createdAt: 'asc' },
      select: {
        direction: true,
        body: true,
        type: true,
        createdAt: true,
      },
    });

    if (messages.length === 0) {
      return { summary: 'No messages in this conversation.', keyTopics: [], sentiment: 'NEUTRAL' };
    }

    const conversationText = messages
      .map((m) => `${m.direction === 'INBOUND' ? 'Customer' : 'Agent'}: ${m.body || `[${m.type}]`}`)
      .join('\n');

    const result = await this.aiProvider.complete({
      systemPrompt: `You are a CRM assistant. Analyze the conversation and return a JSON object with exactly these fields:
- "summary": A 2-3 sentence summary of the conversation
- "keyTopics": An array of 1-5 key topics discussed
- "sentiment": One of "POSITIVE", "NEUTRAL", or "NEGATIVE" based on customer sentiment
Return ONLY valid JSON, no other text.`,
      userPrompt: `Conversation:\n${conversationText}`,
      maxTokens: 500,
    });

    let summary = 'Unable to generate summary.';
    let keyTopics: string[] = [];
    let sentiment = 'NEUTRAL';

    try {
      const parsed = JSON.parse(result.text);
      summary = parsed.summary || summary;
      keyTopics = Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [];
      sentiment = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'].includes(parsed.sentiment) ? parsed.sentiment : 'NEUTRAL';
    } catch {
      // Use defaults
    }

    // Upsert summary
    const saved = await this.prisma.aiConversationSummary.upsert({
      where: { conversationId },
      create: {
        conversationId,
        orgId,
        summary,
        keyTopics,
        sentiment,
      },
      update: {
        summary,
        keyTopics,
        sentiment,
        generatedAt: new Date(),
      },
    });

    return saved;
  }
}
