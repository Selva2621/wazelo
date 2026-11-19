import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { sanitizePromptInput, UNTRUSTED_DATA_RULE, wrapUntrusted } from '@/common/utils/prompt-sanitizer.util';
import { AiProviderService } from '@/modules/ai/domain/services/ai-provider.service';
import { OrgContextService } from '@/modules/ai/domain/services/org-context.service';
import { parseReplies } from '@/modules/ai/application/use-cases/get-smart-replies.use-case';
import { WidgetRepository } from '../../infrastructure/repositories/widget.repository';
import { WebsiteHandoffService } from '../services/website-handoff.service';
import { CHAT_EVENT } from '../../domain/services/website-chat';

export interface WebsiteChatSummary {
  /** 2â€“3 plain sentences: who, what they want, where it stands */
  summary: string;
  /** What the visitor still needs answered */
  openQuestions: string[];
  /** Details the visitor gave: budget, date, productâ€¦ */
  mentioned: Record<string, string>;
  /** Is this likely a real lead? The member decides; this is only a hint */
  leadHint: 'LIKELY' | 'MAYBE' | 'UNLIKELY';
}

/**
 * AI help for the team member who takes a website chat: a summary of what the
 * visitor and the AI said so far, and three replies they could send. The member
 * always chooses; nothing is sent by itself. Credits are charged on the routes.
 */
@Injectable()
export class WebsiteChatAssistUseCase {
  private readonly logger = new Logger(WebsiteChatAssistUseCase.name);

  constructor(
    private readonly widgets: WidgetRepository,
    private readonly aiProvider: AiProviderService,
    private readonly orgContext: OrgContextService,
    private readonly handoff: WebsiteHandoffService,
  ) {}

  async summary(orgId: string, sessionId: string, userId: string): Promise<WebsiteChatSummary> {
    const { transcript } = await this.transcript(orgId, sessionId);
    const profile = await this.orgContext.getContext(orgId, { forCustomers: true });

    const instructions = `Summarise this website chat for the team member taking it over. "Visitor" lines are the website visitor, "AI" lines the business's AI assistant, "Team" lines a person on the team.
${UNTRUSTED_DATA_RULE}
Return ONLY valid JSON:
{
  "summary": "2-3 short plain sentences: what the visitor wants and where it stands",
  "openQuestions": ["what the visitor still needs answered", "..."],
  "mentioned": { "budget": "...", "date": "..." },
  "leadHint": "LIKELY" | "MAYBE" | "UNLIKELY"
}`;
    const result = await this.aiProvider.complete({
      systemPrompt: profile ? `${profile}\n\n---\n\n${instructions}` : instructions,
      userPrompt: `Chat (oldest first):\n${wrapUntrusted('conversation', transcript)}`,
      maxTokens: 400,
    });
    const parsed = parseSummary(result.text);
    if (!parsed) {
      this.logger.warn(`Website chat summary: unreadable AI output for session ${sessionId}`);
      // Throwing means the credit isn't charged
      throw new ServiceUnavailableException("Couldn't summarise this chat right now. Try again.");
    }
    await this.handoff.record(orgId, sessionId, CHAT_EVENT.AI_ASSIST, { type: 'user', id: userId }, { kind: 'summary' });
    return parsed;
  }

  async suggestions(orgId: string, sessionId: string, userId: string): Promise<{ replies: string[]; sources: string[] }> {
    const { transcript, recentVisitor } = await this.transcript(orgId, sessionId);
    // Customers read these: only customer-safe business details
    const [profile, knowledge] = await Promise.all([
      this.orgContext.getContext(orgId, { forCustomers: true }),
      this.orgContext.getRelevantKnowledgeWithSources(orgId, recentVisitor),
    ]);
    const systemPrompt = [
      profile,
      knowledge.prompt,
      [
        "You write website chat replies for a person on the business's team to send to a website visitor.",
        '"Visitor" lines are the visitor; "AI" and "Team" lines were sent by the business.',
        "Suggest 3 replies to the visitor's latest message, as the business, never as the visitor.",
        'Use facts (prices, timings, policies, links) only from the business details above; never invent them.',
        'If a needed fact is missing, offer to check and get back instead of guessing.',
        'Short and friendly, clearly different from each other, in the language the visitor uses.',
        UNTRUSTED_DATA_RULE,
        'Return ONLY a JSON array of 3 strings, no other text.',
      ].join(' '),
    ]
      .filter(Boolean)
      .join('\n\n---\n\n');

    const result = await this.aiProvider.complete({
      systemPrompt,
      userPrompt: `Chat (oldest first):\n${wrapUntrusted('conversation', transcript)}\n\nThe 3 replies, as a JSON array:`,
      maxTokens: 400,
    });
    const replies = parseReplies(result.text);
    if (!replies.length) {
      this.logger.warn(`Website chat suggestions: unreadable AI output for session ${sessionId}`);
      throw new ServiceUnavailableException("Couldn't write suggestions this time. Try again.");
    }
    await this.handoff.record(orgId, sessionId, CHAT_EVENT.AI_ASSIST, { type: 'user', id: userId }, { kind: 'suggestions' });
    return { replies, sources: knowledge.sources };
  }

  private async transcript(orgId: string, sessionId: string) {
    const session = await this.widgets.findSession(sessionId, orgId);
    if (!session) throw new NotFoundException('Chat not found');
    const messages = (await this.widgets.findRecentMessages(sessionId, orgId, 30)).filter((m) => m.sender !== 'system');
    const label = (s: string) => (s === 'visitor' ? 'Visitor' : s === 'bot' ? 'AI' : 'Team');
    const transcript = messages.map((m) => `${label(m.sender)}: ${sanitizePromptInput(m.body, 1000)}`).join('\n').slice(-8000);
    const recentVisitor = messages
      .filter((m) => m.sender === 'visitor')
      .slice(-3)
      .map((m) => m.body)
      .join(' ');
    return { transcript: transcript || '(no messages yet)', recentVisitor };
  }
}

/** The model's JSON (often wrapped in ```json or a sentence) â†’ a summary, or null when unreadable */
export function parseSummary(text: string): WebsiteChatSummary | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const raw = JSON.parse(match ? match[0] : text) as Record<string, unknown>;
    const summary = typeof raw.summary === 'string' ? raw.summary.trim() : '';
    if (!summary) return null;
    const openQuestions = Array.isArray(raw.openQuestions)
      ? raw.openQuestions.filter((q): q is string => typeof q === 'string' && !!q.trim()).map((q) => q.trim()).slice(0, 5)
      : [];
    const mentioned: Record<string, string> = {};
    if (raw.mentioned && typeof raw.mentioned === 'object') {
      for (const [k, v] of Object.entries(raw.mentioned as Record<string, unknown>)) {
        if (typeof v === 'string' && v.trim()) mentioned[k.slice(0, 40)] = v.trim().slice(0, 200);
      }
    }
    const leadHint = raw.leadHint === 'LIKELY' || raw.leadHint === 'UNLIKELY' ? raw.leadHint : 'MAYBE';
    return { summary: summary.slice(0, 800), openQuestions, mentioned, leadHint };
  } catch {
    return null;
  }
}
