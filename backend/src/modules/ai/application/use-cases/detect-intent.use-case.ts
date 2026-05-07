import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AiProviderService } from '../../domain/services/ai-provider.service';

export interface IntentResult {
  primaryIntent: string;
  subIntent: string | null;
  entities: Record<string, string>; // extracted key info: product name, order ID, etc.
  suggestedAction: string | null;   // e.g. "assign_to_sales", "create_ticket", "send_catalog"
}

@Injectable()
export class DetectIntentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
  ) {}

  /**
   * Detect customer intent from conversation messages.
   * Useful for routing, auto-assignment, and workflow triggers.
   */
  async execute(conversationId: string, orgId: string): Promise<IntentResult> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId, orgId, direction: 'INBOUND' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { body: true },
    });

    if (messages.length === 0) {
      return { primaryIntent: 'unknown', subIntent: null, entities: {}, suggestedAction: null };
    }

    const customerText = messages.reverse().map((m) => m.body || '').filter(Boolean).join('\n');

    const result = await this.aiProvider.complete({
      systemPrompt: `You are an intent detection engine for a WhatsApp CRM. Analyze the customer messages and return ONLY valid JSON:
{
  "primaryIntent": "one of: purchase, support, complaint, billing, appointment, information, feedback, cancellation, referral, spam, other",
  "subIntent": "more specific intent or null",
  "entities": { "key": "value" },  // Extract: product names, order IDs, dates, amounts, phone numbers mentioned
  "suggestedAction": "one of: assign_to_sales, assign_to_support, create_ticket, send_catalog, schedule_callback, escalate, send_invoice, no_action, null"
}`,
      userPrompt: `Customer messages:\n${customerText}`,
      maxTokens: 400,
    });

    try {
      const parsed = JSON.parse(result.text);
      return {
        primaryIntent: parsed.primaryIntent || 'other',
        subIntent: parsed.subIntent || null,
        entities: typeof parsed.entities === 'object' && parsed.entities ? parsed.entities : {},
        suggestedAction: parsed.suggestedAction || null,
      };
    } catch {
      return { primaryIntent: 'other', subIntent: null, entities: {}, suggestedAction: null };
    }
  }
}
