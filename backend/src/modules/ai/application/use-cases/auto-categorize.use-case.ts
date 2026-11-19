import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AiProviderService } from '../../domain/services/ai-provider.service';
import { OrgContextService } from '../../domain/services/org-context.service';
import { MessageEncryptionService } from '@/modules/messages/domain/services/message-encryption.service';

export interface CategorizationResult {
  suggestedLabels: string[];
  intent: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  language: string;
}

@Injectable()
export class AutoCategorizeUseCase {
  private readonly logger = new Logger(AutoCategorizeUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
    private readonly orgContext: OrgContextService,
    private readonly messageCrypto: MessageEncryptionService,
  ) {}

  /**
   * Analyze conversation and auto-suggest labels, intent, priority, and language.
   * Can be triggered automatically on new conversations or manually by agents.
   */
  async execute(conversationId: string, orgId: string): Promise<CategorizationResult> {
    // Bodies are encrypted at rest
    const messages = this.messageCrypto.decryptBodies(
      await this.prisma.message.findMany({
        where: { conversationId, orgId },
        orderBy: { createdAt: 'asc' },
        take: 15,
        select: { direction: true, body: true, type: true },
      }),
    );

    if (messages.length === 0) {
      return { suggestedLabels: [], intent: 'unknown', priority: 'MEDIUM', language: 'en' };
    }

    // Get existing org labels/tags for context
    const existingTags = await this.prisma.tag.findMany({
      where: { orgId },
      select: { name: true },
      take: 50,
    });

    const tagNames = existingTags.map((t) => t.name);
    const conversationText = messages
      .map((m) => `${m.direction === 'INBOUND' ? 'Customer' : 'Agent'}: ${m.body || `[${m.type}]`}`)
      .join('\n');

    const orgContextStr = await this.orgContext.getContext(orgId);
    const BASE_SYSTEM_PROMPT = `You are a CRM categorization engine. Analyze the conversation and return ONLY valid JSON:
{
  "suggestedLabels": ["label1", "label2"],  // 1-3 labels. Prefer from existing: [${tagNames.join(', ')}]. Create new ones only if none fit.
  "intent": "string",  // One of: "purchase_inquiry", "support_request", "complaint", "feedback", "general_inquiry", "billing", "return_refund", "appointment", "follow_up", "spam"
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "language": "ISO 639-1 code"  // e.g. "en", "es", "ar", "hi", "ta"
}`;
    const result = await this.aiProvider.complete({
      systemPrompt: orgContextStr ? `${orgContextStr}\n\n---\n\n${BASE_SYSTEM_PROMPT}` : BASE_SYSTEM_PROMPT,
      userPrompt: `Conversation:\n${conversationText}`,
      maxTokens: 300,
    });

    try {
      const parsed = JSON.parse(result.text);
      return {
        suggestedLabels: Array.isArray(parsed.suggestedLabels) ? parsed.suggestedLabels.slice(0, 3) : [],
        intent: parsed.intent || 'general_inquiry',
        priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(parsed.priority) ? parsed.priority : 'MEDIUM',
        language: parsed.language || 'en',
      };
    } catch {
      return { suggestedLabels: [], intent: 'general_inquiry', priority: 'MEDIUM', language: 'en' };
    }
  }

  /**
   * Saves the tags the agent was shown onto the chat's contact, plus the language,
   * intent and priority read alongside them. No AI call (so no credit): it stores
   * exactly what's on screen. Reuses an existing tag whatever its letter case.
   */
  async saveToContact(
    conversationId: string,
    orgId: string,
    userId: string,
    input: { labels: string[]; language?: string; intent?: string; priority?: CategorizationResult['priority'] },
  ): Promise<{ added: string[]; alreadyHad: string[] }> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, orgId },
      select: { contactId: true, contactPhone: true },
    });
    // WhatsApp chats often carry only the phone number; match the contact by it,
    // the same way the inbox's contact panel does
    const contactId =
      conversation?.contactId ??
      (conversation?.contactPhone
        ? (
            await this.prisma.contact.findFirst({
              where: { orgId, phoneNumber: conversation.contactPhone, deletedAt: null },
              select: { id: true },
            })
          )?.id
        : undefined);
    if (!contactId) {
      throw new NotFoundException('Add this person as a contact first, then save the tag.');
    }

    const labels = [...new Set(input.labels.map((l) => l.trim()).filter(Boolean))];
    const added: string[] = [];
    const alreadyHad: string[] = [];
    for (const label of labels) {
      const tag =
        (await this.prisma.tag.findFirst({
          where: { orgId, name: { equals: label, mode: 'insensitive' }, deletedAt: null },
        })) ?? (await this.prisma.tag.create({ data: { orgId, name: label } }));

      const existing = await this.prisma.contactTag.findFirst({ where: { contactId, tagId: tag.id } });
      if (existing) {
        alreadyHad.push(tag.name);
        continue;
      }
      await this.prisma.contactTag.create({ data: { contactId, tagId: tag.id, orgId, addedById: userId } });
      added.push(tag.name);
    }

    if (input.language || input.intent || input.priority) {
      const contact = await this.prisma.contact.findUnique({ where: { id: contactId }, select: { metadata: true } });
      const existingMeta = (contact?.metadata as Record<string, unknown>) ?? {};
      await this.prisma.contact.update({
        where: { id: contactId },
        data: {
          metadata: {
            ...existingMeta,
            ...(input.language ? { preferredLanguage: input.language } : {}),
            ...(input.intent ? { lastAiIntent: input.intent } : {}),
            ...(input.priority ? { lastAiPriority: input.priority } : {}),
          },
        },
      });
    }

    return { added, alreadyHad };
  }
}
