import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AiProviderService } from '../../domain/services/ai-provider.service';
import { OrgContextService } from '../../domain/services/org-context.service';
import { MessageEncryptionService } from '@/modules/messages/domain/services/message-encryption.service';
import { sanitizePromptInput } from '@/common/utils/prompt-sanitizer.util';

export const REPLY_TONES = ['friendly', 'formal', 'short'] as const;
export type ReplyTone = (typeof REPLY_TONES)[number];

export interface SmartReplyOptions {
  tone?: ReplyTone;
  /** What the agent wants the reply to do, e.g. "ask for their budget" */
  goal?: string;
}

export interface SmartRepliesResult {
  replies: string[];
  /** Titles of the website pages, files and FAQs the replies drew on */
  sources: string[];
}

const TONE_RULES: Record<ReplyTone, string> = {
  friendly: 'Tone: warm and friendly, like a helpful person; one emoji at most.',
  formal: 'Tone: polite and formal, no emoji, no slang.',
  short: 'Tone: very short and to the point, one sentence each, under 20 words.',
};

@Injectable()
export class GetSmartRepliesUseCase {
  private readonly logger = new Logger(GetSmartRepliesUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
    private readonly orgContext: OrgContextService,
    private readonly messageCrypto: MessageEncryptionService,
  ) {}

  /**
   * Three messages the business could send next. Draws on the org's knowledge
   * (website, files, FAQs) for facts. Throws instead of returning canned text when
   * the AI fails, so nothing generic is shown and no credit is charged.
   */
  async execute(conversationId: string, orgId: string, options: SmartReplyOptions = {}): Promise<SmartRepliesResult> {
    // Last 20 messages; bodies are encrypted at rest
    const messages = this.messageCrypto
      .decryptBodies(
        await this.prisma.message.findMany({
          where: { conversationId, orgId },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { direction: true, body: true, type: true, createdAt: true },
        }),
      )
      .reverse();

    const goal = options.goal ? sanitizePromptInput(options.goal, 200) : '';
    const tone: ReplyTone = options.tone && TONE_RULES[options.tone] ? options.tone : 'friendly';

    const conversation = messages
      .map((m) => `${m.direction === 'INBOUND' ? 'Customer' : 'Agent'}: ${m.body ? sanitizePromptInput(m.body) : `[${m.type}]`}`)
      .join('\n')
      .slice(-8000);

    // Look up knowledge for what the customer said lately (and what the agent wants to do)
    const recentCustomer = messages
      .filter((m) => m.direction === 'INBOUND' && m.body)
      .slice(-3)
      .map((m) => m.body)
      .join(' ');
    const [businessContext, knowledge] = await Promise.all([
      this.orgContext.getContext(orgId),
      this.orgContext.getRelevantKnowledgeWithSources(orgId, [recentCustomer, goal].filter(Boolean).join(' ')),
    ]);

    const lastFromAgent = messages.length > 0 && messages[messages.length - 1].direction !== 'INBOUND';
    const situation =
      messages.length === 0
        ? 'There are no messages yet: suggest 3 short opening messages.'
        : lastFromAgent
          ? "The business sent the last message and the customer hasn't answered yet: suggest 3 short, polite follow-ups that move the conversation forward."
          : "Suggest 3 replies to the customer's latest message.";

    const systemPrompt = [
      businessContext,
      knowledge.prompt,
      [
        'You write WhatsApp messages for the business (the "Agent") to send to its customer.',
        'In the conversation, "Agent" lines were sent by the business and "Customer" lines by the customer.',
        'Write as the business, never as the customer: do not thank the business, accept its offer, or reply to it.',
        situation,
        goal ? `Every message must do this (the agent's instruction): ${goal}.` : '',
        TONE_RULES[tone],
        'Use facts (prices, timings, policies, links) only from the business details above; never invent them.',
        'If a needed fact is missing, offer to check and get back instead of guessing.',
        'Make the 3 messages clearly different from each other, specific to this chat, and in the language the customer uses.',
        'Return ONLY a JSON array of 3 strings, no other text.',
      ]
        .filter(Boolean)
        .join(' '),
    ]
      .filter(Boolean)
      .join('\n\n---\n\n');

    const result = await this.aiProvider.complete({
      systemPrompt,
      userPrompt: `Conversation (oldest first):\n${conversation || '(no messages yet)'}\n\nThe 3 messages the business could send next, as a JSON array:`,
      maxTokens: 400,
    });

    const replies = parseReplies(result.text);
    if (replies.length === 0) {
      this.logger.warn(`Smart replies: unreadable AI output for conversation ${conversationId}`);
      throw new ServiceUnavailableException("Couldn't write suggestions this time. Try again.");
    }
    return { replies, sources: knowledge.sources };
  }
}

/** Pulls up to 3 distinct non-empty strings out of the model's answer */
export function parseReplies(text: string): string[] {
  try {
    // Models often wrap the array in ```json fences or a sentence; take the array itself
    const match = text.match(/\[[\s\S]*\]/);
    const parsed: unknown = JSON.parse(match ? match[0] : text);
    if (!Array.isArray(parsed)) return [];
    const clean = parsed
      .filter((r): r is string => typeof r === 'string')
      .map((r) => r.trim())
      .filter(Boolean);
    return [...new Set(clean)].slice(0, 3);
  } catch {
    return [];
  }
}
