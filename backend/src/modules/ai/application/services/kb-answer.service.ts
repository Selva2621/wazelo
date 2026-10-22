import { Injectable } from '@nestjs/common';
import { sanitizePromptInput } from '@/common/utils/prompt-sanitizer.util';
import { KbChunkRepository, ChunkHit } from '@/modules/knowledge-base/infrastructure/repositories/kb-chunk.repository';
import { AiProviderService } from '../../domain/services/ai-provider.service';
import { OrgContextService } from '../../domain/services/org-context.service';

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
  maxTokens?: number;
}

const PASSAGES = 6;
const PASSAGE_CHARS = 1200;

/**
 * One way to answer from what the org taught us (website pages, uploaded documents,
 * published articles, business profile). Used by the WhatsApp chatbot, the website
 * widget and the inbox KB search, so they all give the same answer.
 */
@Injectable()
export class KbAnswerService {
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

    const knowledge = hits
      .map((h, i) => `[${i + 1}] ${sanitizePromptInput(h.title ?? 'Untitled', 200)}\n${h.content.slice(0, PASSAGE_CHARS)}`)
      .join('\n\n---\n\n');

    const system = [
      profile ? `${profile}\n\n---` : '',
      q.instructions ? `Instructions from the business:\n${sanitizePromptInput(q.instructions, 2000)}\n\n---` : '',
      'You answer customers on behalf of this business.',
      'Use ONLY the business profile above and the numbered knowledge passages. Never invent prices, policies, dates or contact details.',
      "If they don't contain the answer, say politely that you'll check with the team and get back, and set found to false.",
      "Reply in the customer's language, short and friendly (2–4 sentences), like a WhatsApp message. No markdown headings.",
      'Return ONLY valid JSON: {"answer": "...", "found": true|false, "sources": [passage numbers used], "confidence": 0.0-1.0}',
    ]
      .filter(Boolean)
      .join('\n');

    const user = [
      knowledge ? `Knowledge passages:\n${knowledge}` : 'Knowledge passages: (none matched)',
      q.conversation ? `Conversation so far:\n${q.conversation.slice(-4000)}` : '',
      `Customer question: ${question}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const result = await this.aiProvider.complete({ systemPrompt: system, userPrompt: user, maxTokens: q.maxTokens ?? 500 });
    return parseAnswer(result.text, hits);
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
