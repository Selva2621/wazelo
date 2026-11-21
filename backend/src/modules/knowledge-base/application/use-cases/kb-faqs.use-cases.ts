import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import { AiProviderService } from '@/modules/ai/domain/services/ai-provider.service';
import { AiCreditsService } from '@/modules/billing/domain/services/ai-credits.service';
import { KbRepository } from '../../infrastructure/repositories/kb.repository';
import { KbIndexService } from '../services/kb-index.service';

export interface FaqItem {
  question: string;
  answer: string;
}

const CONTENT_BUDGET = 14_000; // characters of website/file text sent to the AI
const MAX_SUGGESTIONS = 10;
export const MAX_QUESTION = 200;
export const MAX_ANSWER = 1000;

const key = (q: string) => q.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();

/**
 * Pulls `[{question, answer}]` out of the AI's reply: tolerates prose or code
 * fences around the JSON, drops malformed or over-long items, and skips
 * questions already published (or repeated).
 */
export function parseFaqs(text: string, existing: string[] = []): FaqItem[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(match[0]);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];

  const seen = new Set(existing.map(key));
  const out: FaqItem[] = [];
  for (const item of raw) {
    const question = typeof item?.question === 'string' ? item.question.trim() : '';
    const answer = typeof item?.answer === 'string' ? item.answer.trim() : '';
    if (question.length < 5 || answer.length < 2) continue;
    if (question.length > MAX_QUESTION || answer.length > MAX_ANSWER) continue;
    const k = key(question);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push({ question, answer });
    if (out.length === MAX_SUGGESTIONS) break;
  }
  return out;
}

/** Shares the text budget across documents so one long page can't crowd out the rest. */
export function buildContent(docs: { title: string; extractedText: string | null }[], budget = CONTENT_BUDGET): string {
  const texts = docs
    .map((d) => ({ title: d.title, text: (d.extractedText ?? '').replace(/\s+/g, ' ').trim() }))
    .filter((d) => d.text.length > 0);
  if (!texts.length) return '';
  const parts: string[] = [];
  let left = budget;
  texts.forEach((d, i) => {
    const share = Math.floor(left / (texts.length - i));
    const text = d.text.slice(0, share);
    left -= text.length;
    parts.push(`## ${d.title}\n${text}`);
  });
  return parts.join('\n\n');
}

const SYSTEM_PROMPT = `You write the FAQ section for a business, from its own website and documents.
Return ONLY a JSON array of up to ${MAX_SUGGESTIONS} objects: [{"question": "...", "answer": "..."}]
Rules:
- Questions a real customer would ask on WhatsApp before buying: prices, plans, services, delivery, timings, location, refunds, how to start.
- Answers use ONLY facts in the content. Never invent prices, numbers, dates or promises. Skip a question if the content doesn't answer it.
- Answers are 1-3 short sentences, friendly, written as the business ("we").
- Write in the language the content is mostly written in.
- Do not repeat any question listed under "Already answered".`;

/** GET /kb/faqs, POST /kb/faqs/generate and POST /kb/faqs */
@Injectable()
export class KbFaqsUseCase {
  private readonly logger = new Logger(KbFaqsUseCase.name);

  constructor(
    private readonly repo: KbRepository,
    private readonly ai: AiProviderService,
    private readonly aiCredits: AiCreditsService,
    private readonly kbIndex: KbIndexService,
    private readonly events: EventEmitter2,
  ) {}

  list(orgId: string) {
    return this.repo.findFaqs(orgId);
  }

  /** Suggestions only — nothing is saved until the user publishes them. */
  async suggest(orgId: string): Promise<{ suggestions: FaqItem[] }> {
    const docs = await this.repo.findOrgWideTexts(orgId);
    const content = buildContent(docs);
    if (!content) throw new BadRequestException('Add your website or a file first, so there is something to write FAQs from.');
    await this.aiCredits.assertCanAfford(orgId, 'faq_generate');

    const existing = (await this.repo.findFaqs(orgId)).map((f) => f.title);
    const { text } = await this.ai.complete({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: `Already answered:\n${existing.length ? existing.map((q) => `- ${q}`).join('\n') : '(none)'}\n\nContent:\n${content}`,
      maxTokens: 2000,
    });
    if (!text.trim()) throw new ServiceUnavailableException('AI is not available right now. Try again in a minute.');

    const suggestions = parseFaqs(text, existing);
    if (suggestions.length) await this.aiCredits.charge(orgId, 'faq_generate');
    else this.logger.warn(`FAQ suggestions: no usable items from the AI (org ${orgId})`);
    return { suggestions };
  }

  async publish(orgId: string, userId: string, items: FaqItem[]) {
    const clean = items
      .map((i) => ({ question: i.question.trim(), answer: i.answer.trim() }))
      .filter((i) => i.question && i.answer);
    if (!clean.length) throw new BadRequestException('Nothing to publish');

    const ids = await this.repo.createFaqs(orgId, userId, clean);
    await Promise.all(ids.map((id) => this.kbIndex.indexArticle(id)));
    this.events.emit(EVENT_NAMES.KB_ARTICLE_PUBLISHED, { orgId });
    return { published: ids.length };
  }
}
