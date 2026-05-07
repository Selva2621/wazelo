import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AiProviderService } from '../../domain/services/ai-provider.service';
import { sanitizePromptInput } from '@/common/utils/prompt-sanitizer.util';

export type SentimentLabel = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'URGENT';

export interface SentimentResult {
  sentiment: SentimentLabel;
  confidence: number;
  reason: string;
}

@Injectable()
export class AnalyzeSentimentUseCase {
  private readonly logger = new Logger(AnalyzeSentimentUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
  ) {}

  /**
   * Analyze sentiment of last N messages in a conversation.
   * Used for real-time agent dashboards and escalation triggers.
   */
  async execute(conversationId: string, orgId: string): Promise<SentimentResult> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId, orgId, direction: 'INBOUND' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { body: true, createdAt: true },
    });

    if (messages.length === 0) {
      return { sentiment: 'NEUTRAL', confidence: 1, reason: 'No inbound messages' };
    }

    const customerMessages = messages
      .reverse()
      .map((m) => sanitizePromptInput(m.body || ''))
      .filter(Boolean)
      .join('\n');

    const result = await this.aiProvider.complete({
      systemPrompt: `You are a sentiment analysis engine for a CRM. Analyze the customer messages and return ONLY valid JSON:
{
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "URGENT",
  "confidence": 0.0-1.0,
  "reason": "Brief explanation"
}
- URGENT = customer is frustrated, threatening to leave, or needs immediate help
- NEGATIVE = unhappy but not urgent
- NEUTRAL = factual/informational
- POSITIVE = happy, thankful, complimenting`,
      userPrompt: `Customer messages:\n${customerMessages}`,
      maxTokens: 200,
    });

    try {
      const parsed = JSON.parse(result.text);
      return {
        sentiment: ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'URGENT'].includes(parsed.sentiment)
          ? parsed.sentiment
          : 'NEUTRAL',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        reason: parsed.reason || '',
      };
    } catch {
      return { sentiment: 'NEUTRAL', confidence: 0, reason: 'Analysis failed' };
    }
  }

  /**
   * Batch analyze — called by event handler on incoming messages
   */
  async analyzeMessage(messageBody: string): Promise<SentimentLabel> {
    if (!messageBody?.trim()) return 'NEUTRAL';

    const result = await this.aiProvider.complete({
      systemPrompt: `Classify the customer message sentiment as exactly one of: POSITIVE, NEUTRAL, NEGATIVE, URGENT. Return ONLY the label, nothing else.`,
      userPrompt: sanitizePromptInput(messageBody),
      maxTokens: 10,
    });

    const label = result.text.trim().toUpperCase() as SentimentLabel;
    return ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'URGENT'].includes(label) ? label : 'NEUTRAL';
  }
}
