import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { MessageEncryptionService } from '@/modules/messages/domain/services/message-encryption.service';
import { sanitizePromptInput } from '@/common/utils/prompt-sanitizer.util';
import { KbAnswerService } from '../services/kb-answer.service';

export interface KbRagResult {
  answer: string;
  /** articleId holds the document id for website pages / uploaded documents (slug is then empty) */
  sources: { articleId: string; title: string; slug: string; url?: string | null; relevance: number }[];
  confidence: number;
  /** Why there's no answer, when the reply check stopped it */
  blocked?: string;
  /** The AI call behind it (absent when no AI was called) */
  usage?: { model?: string; tokens?: number };
}

@Injectable()
export class KbRagSearchUseCase {
  private readonly logger = new Logger(KbRagSearchUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kbAnswer: KbAnswerService,
    private readonly messageCrypto: MessageEncryptionService,
  ) {}

  /**
   * RAG-style search: find relevant knowledge (website, documents, articles) and generate an answer.
   * Used by agents to quickly find answers, or by chatbot for auto-replies.
   */
  async execute(rawQuery: string, orgId: string): Promise<KbRagResult> {
    // Sanitize query before using it in AI prompt and DB search
    const query = sanitizePromptInput(rawQuery, 500);
    if (!query) return { answer: '', sources: [], confidence: 0 };

    // Website pages, uploaded documents and published articles, ranked by full-text search
    const result = await this.kbAnswer.answer({ orgId, question: query, maxTokens: 600 });
    if (!result.answer || !result.found) return { answer: '', sources: [], confidence: 0, blocked: result.blocked, usage: result.usage };

    const articleIds = result.sources.map((s) => s.articleId).filter((id): id is string => !!id);
    const articles = articleIds.length
      ? await this.prisma.kbArticle.findMany({ where: { id: { in: articleIds } }, select: { id: true, slug: true } })
      : [];
    const slugs = new Map(articles.map((a) => [a.id, a.slug]));
    // Views of articles actually used to answer
    if (articleIds.length) {
      await this.prisma.kbArticle.updateMany({ where: { id: { in: articleIds } }, data: { viewCount: { increment: 1 } } });
    }

    return {
      answer: result.answer,
      sources: result.sources.map((s, i) => ({
        articleId: s.articleId ?? s.documentId ?? '',
        title: s.title,
        slug: (s.articleId && slugs.get(s.articleId)) || '',
        url: s.url,
        relevance: 1 - i * 0.1,
      })),
      confidence: result.confidence,
      usage: result.usage,
    };
  }

  /**
   * Suggest KB articles for an active conversation (agent assist).
   */
  async suggestForConversation(conversationId: string, orgId: string): Promise<KbRagResult> {
    // Bodies are encrypted at rest
    const messages = this.messageCrypto.decryptBodies(
      await this.prisma.message.findMany({
        where: { conversationId, orgId, direction: 'INBOUND' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { body: true },
      }),
    );

    const query = messages
      .reverse()
      .map((m) => sanitizePromptInput(m.body || '', 200))
      .filter(Boolean)
      .join(' ')
      .slice(0, 500);

    if (!query.trim()) return { answer: '', sources: [], confidence: 0 };

    return this.execute(query, orgId);
  }
}
