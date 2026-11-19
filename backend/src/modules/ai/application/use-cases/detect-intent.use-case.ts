import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AiProviderService } from '../../domain/services/ai-provider.service';
import { MessageEncryptionService } from '@/modules/messages/domain/services/message-encryption.service';

export interface IntentResult {
  primaryIntent: string;
  subIntent: string | null;
  entities: Record<string, string>; // extracted key info: product name, order ID, etc.
  suggestedAction: string | null;   // e.g. "assign_to_sales", "create_ticket", "send_catalog"
}

/** A model's "value", treating "null" / "none" / "n/a" / blank (which models write as strings) as no value. */
function textOrNull(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  return text === '' || /^(null|none|n\/a|undefined)$/i.test(text) ? null : text;
}

@Injectable()
export class DetectIntentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
    private readonly messageCrypto: MessageEncryptionService,
  ) {}

  /**
   * Detect customer intent from conversation messages.
   * Useful for routing, auto-assignment, and workflow triggers.
   */
  async execute(conversationId: string, orgId: string): Promise<IntentResult> {
    // Bodies are encrypted at rest
    const messages = this.messageCrypto.decryptBodies(
      await this.prisma.message.findMany({
        where: { conversationId, orgId, direction: 'INBOUND' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { body: true },
      }),
    );

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
      // Models often wrap the JSON in ```json fences or a sentence; take the object itself
      const match = result.text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : result.text);
      const entities =
        typeof parsed.entities === 'object' && parsed.entities && !Array.isArray(parsed.entities)
          ? Object.fromEntries(
              Object.entries(parsed.entities as Record<string, unknown>)
                .map(([k, v]) => [k, textOrNull(v)])
                .filter((e): e is [string, string] => e[1] !== null),
            )
          : {};
      return {
        primaryIntent: textOrNull(parsed.primaryIntent) ?? 'other',
        subIntent: textOrNull(parsed.subIntent),
        entities,
        suggestedAction: textOrNull(parsed.suggestedAction),
      };
    } catch {
      return { primaryIntent: 'other', subIntent: null, entities: {}, suggestedAction: null };
    }
  }
}
