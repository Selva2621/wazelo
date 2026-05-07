import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AiProviderService } from '../../domain/services/ai-provider.service';
import { OrgContextService } from '../../domain/services/org-context.service';
import { sanitizePromptInput } from '@/common/utils/prompt-sanitizer.util';

@Injectable()
export class GetSmartRepliesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
    private readonly orgContext: OrgContextService,
  ) {}

  async execute(conversationId: string, orgId: string): Promise<{ replies: string[] }> {
    // Get last 20 messages for context
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        orgId,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        direction: true,
        body: true,
        type: true,
        createdAt: true,
      },
    });

    if (messages.length === 0) {
      return { replies: ['Hello! How can I help you today?', 'Hi, thanks for reaching out!', 'Welcome! What can I do for you?'] };
    }

    // Build conversation context — sanitize each message body before injecting into prompt
    const conversationContext = messages
      .reverse()
      .map((m) => {
        const body = m.body ? sanitizePromptInput(m.body) : `[${m.type}]`;
        return `${m.direction === 'INBOUND' ? 'Customer' : 'Agent'}: ${body}`;
      })
      .join('\n')
      .slice(0, 8000);

    const orgContextStr = await this.orgContext.getContext(orgId);
    const BASE_SYSTEM_PROMPT = `You are a helpful customer support assistant. Based on the conversation below, suggest exactly 3 short reply options for the agent. Each reply should be professional, helpful, and contextually appropriate. Return ONLY a JSON array of 3 strings, no other text.`;
    const result = await this.aiProvider.complete({
      systemPrompt: orgContextStr ? `${orgContextStr}\n\n---\n\n${BASE_SYSTEM_PROMPT}` : BASE_SYSTEM_PROMPT,
      userPrompt: `Conversation:\n${conversationContext}\n\nSuggest 3 short professional replies for the agent:`,
      maxTokens: 300,
    });

    try {
      const parsed = JSON.parse(result.text);
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return { replies: parsed.slice(0, 3) };
      }
    } catch {
      // Fallback if parsing fails
    }

    return {
      replies: [
        'Thank you for your message. Let me look into this.',
        'I understand. Let me help you with that.',
        'Sure, I can assist you with this right away.',
      ],
    };
  }
}
