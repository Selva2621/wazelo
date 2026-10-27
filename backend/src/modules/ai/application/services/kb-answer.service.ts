import { Injectable, Logger } from '@nestjs/common';
import { sanitizePromptInput, UNTRUSTED_DATA_RULE, wrapUntrusted } from '@/common/utils/prompt-sanitizer.util';
import { KbChunkRepository, ChunkHit } from '@/modules/knowledge-base/infrastructure/repositories/kb-chunk.repository';
import { AiProviderService } from '../../domain/services/ai-provider.service';
import { OrgContextService } from '../../domain/services/org-context.service';
import { checkReply, ReplyBlockReason } from '../../domain/services/reply-guard';

export interface KnowledgeSource {
  documentId: string | null;
  articleId: string | null;
  title: string;
  url: string | null;
}

export interface KnowledgeAnswer {
  answer: string;
  /** False when the knowledge didn't cover the question (the answer then says so / hands off) */
  found: boolean;
  confidence: number;
  sources: KnowledgeSource[];
  /** Set when the reply check stopped the answer (answer is then empty): a person should take over */
  blocked?: ReplyBlockReason;
}

export interface KnowledgeQuestion {
  orgId: string;
  question: string;
  /** Recent chat, oldest first, as "Customer: … / Agent: …" lines */
  conversation?: string;
  /** Limit uploaded documents to this chatbot flow's (plus org-wide ones) */
  flowId?: string;
  /** The org's own instructions (tone, language, rules), e.g. a chatbot flow's prompt */
  instructions?: string | null;
  /** What the team (and earlier bot replies) sent in this chat: links in it may be repeated */
  teamText?: string;
  maxTokens?: number;
}

const PASSAGES = 6;
const PASSAGE_CHARS = 1200;

/** Our fixed rules (also what the reply check makes sure is never echoed back). */
const KB_RULES = [
  'You answer customers on behalf of this business.',
  'Use ONLY the business profile above and the numbered knowledge passages. Never invent prices, policies, dates or contact details.',
  "If they don't contain the answer, say politely that you'll check with the team and get back, and set found to false.",
  "Reply in the customer's language, short and friendly (2–4 sentences), like a WhatsApp message. No markdown headings.",
  UNTRUSTED_DATA_RULE,
  'Return ONLY valid JSON: {"answer": "...", "found": true|false, "sources": [passage numbers used], "confidence": 0.0-1.0}',
];

/**
 * One way to answer from what the org taught us (website pages, uploaded documents,
 * published articles, business profile). Used by the WhatsApp chatbot, the website
 * widget and the inbox KB search, so they all give the same answer.
 */
@Injectable()
export class KbAnswerService {
  private readonly logger = new Logger(KbAnswerService.name);

  constructor(
    private readonly chunks: KbChunkRepository,
    private readonly aiProvider: AiProviderService,
    private readonly orgContext: OrgContextService,
  ) {}

  async answer(q: KnowledgeQuestion): Promise<KnowledgeAnswer> {
    const question = sanitizePromptInput(q.question, 500);
    const none: KnowledgeAnswer = { answer: '', found: false, confidence: 0, sources: [] };
    if (!question) return none;

    const [hits, profile] = await Promise.all([
      this.chunks.search(q.orgId, question, PASSAGES, { flowId: q.flowId }),
      this.orgContext.getContext(q.orgId),
    ]);
    // Nothing to answer from: don't spend an AI call (or the org's credits) on a guess
    if (!hits.length && !profile) return none;

    // Website pages and documents can carry hidden instructions too, so they're cleaned like customer text
    const knowledge = hits
      .map(
        (h, i) =>
          `[${i + 1}] ${sanitizePromptInput(h.title ?? 'Untitled', 200)}\n${sanitizePromptInput(h.content, PASSAGE_CHARS)}`,
      )
      .join('\n\n---\n\n');
    const instructions = q.instructions ? sanitizePromptInput(q.instructions, 2000) : '';
    const conversation = q.conversation ? sanitizePromptInput(q.conversation.slice(-4000), 4000) : '';

    const system = [
      profile ? `${profile}\n\n---` : '',
      instructions ? `Instructions from the business:\n${instructions}\n\n---` : '',
      ...KB_RULES,
    ]
      .filter(Boolean)
      .join('\n');

    const user = [
      knowledge ? `Knowledge passages:\n${wrapUntrusted('passages', knowledge)}` : 'Knowledge passages: (none matched)',
      conversation ? `Conversation so far:\n${wrapUntrusted('conversation', conversation)}` : '',
      `Customer question:\n${wrapUntrusted('customer_question', question)}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const result = await this.aiProvider.complete({ systemPrompt: system, userPrompt: user, maxTokens: q.maxTokens ?? 500 });
    const parsed = parseAnswer(result.text, hits);
    if (!parsed.answer) return parsed;

    const check = checkReply({
      reply: parsed.answer,
      ownInstructions: KB_RULES.join('\n'),
      trustedText: [profile, knowledge, instructions, q.teamText].filter(Boolean).join('\n'),
      customerText: `${conversation}\n${question}`,
    });
    if (!check.ok) {
      this.logger.warn(`KB answer blocked for org ${q.orgId}: ${check.reason}`);
      return { ...none, blocked: check.reason };
    }
    return parsed;
  }
}

/** The model's JSON (often wrapped in ```json or prose) → answer + the passages it cited. */
export function parseAnswer(text: string, hits: ChunkHit[]): KnowledgeAnswer {
  const none: KnowledgeAnswer = { answer: '', found: false, confidence: 0, sources: [] };
  if (!text?.trim()) return none;
  let parsed: { answer?: unknown; found?: unknown; sources?: unknown; confidence?: unknown };
  try {
    const match = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : text);
  } catch {
    // Plain text reply: usable, but unsourced
    return { answer: text.trim(), found: true, confidence: 0.4, sources: [] };
  }
  const answer = typeof parsed.answer === 'string' ? parsed.answer.trim() : '';
  if (!answer) return none;

  const cited = Array.isArray(parsed.sources) ? parsed.sources : [];
  const seen = new Set<string>();
  const sources: KnowledgeSource[] = [];
  for (const n of cited) {
    const hit = typeof n === 'number' ? hits[n - 1] : undefined;
    if (!hit) continue;
    const key = hit.articleId ?? hit.documentId ?? hit.id;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({ documentId: hit.documentId, articleId: hit.articleId, title: hit.title ?? 'Untitled', url: hit.sourceUrl });
  }
  const confidence = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5;
  return { answer, found: parsed.found !== false, confidence, sources };
}
