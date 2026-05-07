import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AiProviderService } from '../../domain/services/ai-provider.service';
import { OrgContextService } from '../../domain/services/org-context.service';

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
  ) {}

  /**
   * Analyze conversation and auto-suggest labels, intent, priority, and language.
   * Can be triggered automatically on new conversations or manually by agents.
   */
  async execute(conversationId: string, orgId: string): Promise<CategorizationResult> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId, orgId },
      orderBy: { createdAt: 'asc' },
      take: 15,
      select: { direction: true, body: true, type: true },
    });

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
   * Auto-apply categorization: create tags and update conversation metadata.
   */
  async applyToConversation(conversationId: string, orgId: string): Promise<CategorizationResult> {
    const result = await this.execute(conversationId, orgId);

    // Get conversation to find contactId
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, orgId },
      select: { id: true, contactId: true, assignedToId: true },
    });

    if (!conversation || !conversation.contactId) return result;

    // Auto-apply labels as tags on the contact
    for (const label of result.suggestedLabels) {
      let tag = await this.prisma.tag.findFirst({
        where: { orgId, name: label, deletedAt: null },
      });
      if (!tag) {
        tag = await this.prisma.tag.create({ data: { orgId, name: label } });
      }

      const existing = await this.prisma.contactTag.findFirst({
        where: { contactId: conversation.contactId, tagId: tag.id },
      });
      if (!existing && conversation.assignedToId) {
        await this.prisma.contactTag.create({
          data: { contactId: conversation.contactId, tagId: tag.id, orgId, addedById: conversation.assignedToId },
        });
      }
    }

    // Enrich contact metadata with detected language and latest intent
    if (result.language || result.intent) {
      const contact = await this.prisma.contact.findUnique({
        where: { id: conversation.contactId },
        select: { metadata: true },
      });
      const existingMeta = (contact?.metadata as Record<string, unknown>) ?? {};
      await this.prisma.contact.update({
        where: { id: conversation.contactId },
        data: {
          metadata: {
            ...existingMeta,
            ...(result.language ? { preferredLanguage: result.language } : {}),
            ...(result.intent ? { lastAiIntent: result.intent } : {}),
            ...(result.priority ? { lastAiPriority: result.priority } : {}),
          },
        },
      });
    }

    return result;
  }
}
