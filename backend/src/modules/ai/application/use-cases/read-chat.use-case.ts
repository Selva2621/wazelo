import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AiProviderService } from '../../domain/services/ai-provider.service';
import { OrgContextService } from '../../domain/services/org-context.service';
import { MessageEncryptionService } from '@/modules/messages/domain/services/message-encryption.service';
import { sanitizePromptInput } from '@/common/utils/prompt-sanitizer.util';

export const MOODS = ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'URGENT'] as const;
export const WANTS = [
  'purchase', 'support', 'complaint', 'billing', 'appointment', 'information',
  'feedback', 'cancellation', 'referral', 'spam', 'other',
] as const;
export const NEXT_STEPS = [
  'assign_to_sales', 'assign_to_support', 'create_ticket', 'send_catalog',
  'schedule_callback', 'escalate', 'send_invoice', 'no_action',
] as const;
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export interface ChatReadout {
  mood: (typeof MOODS)[number];
  /** 0–1: how sure the AI is about the mood */
  confidence: number;
  /** One short reason for the mood, in plain words */
  moodReason: string;
  wants: (typeof WANTS)[number];
  /** A few words on what exactly, e.g. "website price" */
  wantsDetail: string;
  nextStep: (typeof NEXT_STEPS)[number];
  /** Details the customer gave: budget, date, product… */
  mentioned: Record<string, string>;
  tags: string[];
  priority: (typeof PRIORITIES)[number];
  /** ISO 639-1 */
  language: string;
}

export type ReadChatResult =
  | { status: 'no_customer_messages' }
  | { status: 'not_read' }
  | {
      status: 'ready';
      readout: ChatReadout;
      readAt: string;
      /** False when the customer has written since this read; reading again then costs credits */
      upToDate: boolean;
    };

interface CachedRead {
  orgId: string;
  /** The newest customer message the read covered */
  lastInboundId: string;
  readout: ChatReadout;
  readAt: string;
}

/** Reads kept in memory (one backend instance); oldest dropped beyond this */
const MAX_CACHED = 2000;

/**
 * "Read this chat": mood, what the customer wants, next step, tags, priority and
 * language from ONE AI call (it used to be three). The read is kept until the
 * customer writes again, so looking again, or pressing Refresh with nothing new,
 * calls no AI and costs nothing (credits are charged only when the AI answers).
 */
@Injectable()
export class ReadChatUseCase {
  private readonly logger = new Logger(ReadChatUseCase.name);
  private readonly cache = new Map<string, CachedRead>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
    private readonly orgContext: OrgContextService,
    private readonly messageCrypto: MessageEncryptionService,
  ) {}

  /** Free: the last read of this chat, if any, and whether it's still current. Never calls the AI. */
  async peek(conversationId: string, orgId: string): Promise<ReadChatResult> {
    const lastInbound = await this.lastInboundId(conversationId, orgId);
    if (!lastInbound) return { status: 'no_customer_messages' };
    const hit = this.cache.get(conversationId);
    if (!hit || hit.orgId !== orgId) return { status: 'not_read' };
    return { status: 'ready', readout: hit.readout, readAt: hit.readAt, upToDate: hit.lastInboundId === lastInbound };
  }

  /** Reads the chat with the AI, unless the last read still covers the newest customer message. */
  async read(conversationId: string, orgId: string): Promise<ReadChatResult> {
    const current = await this.peek(conversationId, orgId);
    if (current.status === 'no_customer_messages') return current;
    if (current.status === 'ready' && current.upToDate) return current;

    const rows = this.messageCrypto.decryptBodies(
      await this.prisma.message.findMany({
        where: { conversationId, orgId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, direction: true, body: true, type: true },
      }),
    );
    const lastInbound = rows.find((m) => m.direction === 'INBOUND');
    if (!lastInbound) return { status: 'no_customer_messages' };

    const conversation = rows
      .reverse()
      .map((m) => `${m.direction === 'INBOUND' ? 'Customer' : 'Agent'}: ${m.body ? sanitizePromptInput(m.body) : `[${m.type}]`}`)
      .join('\n')
      .slice(-8000);

    const [businessContext, existingTags] = await Promise.all([
      this.orgContext.getContext(orgId),
      this.prisma.tag.findMany({ where: { orgId, deletedAt: null }, select: { name: true }, take: 50 }),
    ]);

    const instructions = `Read this WhatsApp chat between a business ("Agent") and its customer ("Customer"). Return ONLY valid JSON:
{
  "mood": ${MOODS.map((m) => `"${m}"`).join(' | ')},   // the customer's mood. URGENT = frustrated, about to leave, or needs help right now
  "confidence": 0.0-1.0,
  "moodReason": "under 10 plain words, e.g. 'asked politely about price'",
  "wants": ${WANTS.map((w) => `"${w}"`).join(' | ')},
  "wantsDetail": "2-5 words on what exactly, e.g. 'website package price', or ''",
  "nextStep": ${NEXT_STEPS.map((s) => `"${s}"`).join(' | ')},
  "mentioned": { "budget": "...", "date": "..." },   // only details the customer actually gave; {} if none
  "tags": ["..."],   // 1-3 short CRM tags. Prefer existing: [${existingTags.map((t) => sanitizePromptInput(t.name, 100)).join(', ')}]
  "priority": ${PRIORITIES.map((p) => `"${p}"`).join(' | ')},
  "language": "ISO 639-1 code the customer writes in"
}`;

    const result = await this.aiProvider.complete({
      systemPrompt: businessContext ? `${businessContext}\n\n---\n\n${instructions}` : instructions,
      userPrompt: `Chat (oldest first):\n${conversation}`,
      maxTokens: 400,
    });

    const readout = parseReadout(result.text);
    if (!readout) {
      this.logger.warn(`Read chat: unreadable AI output for conversation ${conversationId}`);
      // Throwing means the credit isn't charged
      throw new ServiceUnavailableException("Couldn't read this chat right now. Try again.");
    }

    const readAt = new Date().toISOString();
    this.remember(conversationId, { orgId, lastInboundId: lastInbound.id, readout, readAt });
    return { status: 'ready', readout, readAt, upToDate: true };
  }

  private async lastInboundId(conversationId: string, orgId: string): Promise<string | null> {
    const m = await this.prisma.message.findFirst({
      where: { conversationId, orgId, direction: 'INBOUND' },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    return m?.id ?? null;
  }

  private remember(conversationId: string, entry: CachedRead) {
    this.cache.delete(conversationId); // re-insert so it counts as newest
    this.cache.set(conversationId, entry);
    if (this.cache.size > MAX_CACHED) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
  }
}

const pick = <T extends string>(allowed: readonly T[], value: unknown, fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

const text = (value: unknown, max: number) =>
  typeof value === 'string' && !/^(null|none|n\/a|undefined|unknown)$/i.test(value.trim())
    ? value.trim().slice(0, max)
    : '';

/** Turns the model's JSON into a readout; null when it isn't usable */
export function parseReadout(raw: string): ChatReadout | null {
  let parsed: Record<string, unknown>;
  try {
    // Models often wrap JSON in ```json fences or a sentence; take the object itself
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || !MOODS.includes(parsed.mood as never)) return null;

  const mentioned: Record<string, string> = {};
  if (parsed.mentioned && typeof parsed.mentioned === 'object') {
    for (const [k, v] of Object.entries(parsed.mentioned as Record<string, unknown>).slice(0, 6)) {
      const value = text(typeof v === 'number' ? String(v) : v, 80);
      if (value) mentioned[k.slice(0, 30)] = value;
    }
  }
  const tags = Array.isArray(parsed.tags)
    ? [...new Set(parsed.tags.map((t) => text(t, 100)).filter(Boolean))].slice(0, 3)
    : [];
  const confidence = typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5;
  const language = text(parsed.language, 10).toLowerCase();

  return {
    mood: parsed.mood as ChatReadout['mood'],
    confidence,
    moodReason: text(parsed.moodReason, 120),
    wants: pick(WANTS, parsed.wants, 'other'),
    wantsDetail: text(parsed.wantsDetail, 80),
    nextStep: pick(NEXT_STEPS, parsed.nextStep, 'no_action'),
    mentioned,
    tags,
    priority: pick(PRIORITIES, parsed.priority, 'MEDIUM'),
    language: /^[a-z]{2,3}$/.test(language) ? language : 'en',
  };
}
