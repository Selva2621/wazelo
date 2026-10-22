import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AiProviderService } from '../../domain/services/ai-provider.service';
import { OrgContextService } from '../../domain/services/org-context.service';
import { MessageEncryptionService } from '@/modules/messages/domain/services/message-encryption.service';
import { sanitizePromptInput } from '@/common/utils/prompt-sanitizer.util';

@Injectable()
export class GetSmartRepliesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
    private readonly orgContext: OrgContextService,
    private readonly messageCrypto: MessageEncryptionService,
  ) {}

  async execute(conversationId: string, orgId: string): Promise<{ replies: string[] }> {
    // Get last 20 messages for context
    // Bodies are encrypted at rest
    const messages = this.messageCrypto.decryptBodies(
      await this.prisma.message.findMany({
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
      }),
    );

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
    // Who spoke last decides the kind of message: an answer, or a follow-up to our own message
    const lastFromAgent = messages[messages.length - 1]?.direction !== 'INBOUND';
    const BASE_SYSTEM_PROMPT = [
      'You write WhatsApp messages for the business (the "Agent") to send to its customer.',
      'In the conversation, "Agent" lines were sent by the business and "Customer" lines by the customer.',
      'Write as the business, never as the customer: do not thank the business, accept its offer, or reply to it.',
      lastFromAgent
        ? "The business sent the last message and the customer hasn't answered yet: suggest 3 short, polite follow-ups that move the conversation forward."
        : "Suggest 3 short replies to the customer's latest message.",
      'Each one professional, specific to this chat, and in the language the customer uses.',
      'Return ONLY a JSON array of 3 strings, no other text.',
    ].join(' ');
    const result = await this.aiProvider.complete({
      systemPrompt: orgContextStr ? `${orgContextStr}\n\n---\n\n${BASE_SYSTEM_PROMPT}` : BASE_SYSTEM_PROMPT,
      userPrompt: `Conversation (oldest first):\n${conversationContext}\n\nThe 3 messages the business could send next, as a JSON array:`,
      maxTokens: 300,
    });

    try {
      // Models often wrap the array in ```json fences or a sentence; take the array itself
      const match = result.text.match(/\[[\s\S]*\]/);
      const parsed = JSON.parse(match ? match[0] : result.text);
      const replies = Array.isArray(parsed) ? parsed.filter((r): r is string => typeof r === 'string' && r.trim() !== '') : [];
      if (replies.length >= 3) {
        return { replies: replies.slice(0, 3) };
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
