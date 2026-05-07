import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AiProviderService } from '../../domain/services/ai-provider.service';
import { OrgContextService } from '../../domain/services/org-context.service';
import { sanitizePromptInput } from '@/common/utils/prompt-sanitizer.util';

export interface KbRagResult {
  answer: string;
  sources: { articleId: string; title: string; slug: string; relevance: number }[];
  confidence: number;
}

@Injectable()
export class KbRagSearchUseCase {
  private readonly logger = new Logger(KbRagSearchUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
    private readonly orgContext: OrgContextService,
  ) {}

  /**
   * RAG-style search: find relevant KB articles and generate an answer.
   * Used by agents to quickly find answers, or by chatbot for auto-replies.
   */
  async execute(rawQuery: string, orgId: string): Promise<KbRagResult> {
    // Sanitize query before using it in AI prompt and DB search
    const query = sanitizePromptInput(rawQuery, 500);
    if (!query) return { answer: '', sources: [], confidence: 0 };

    // Step 1: Search for relevant KB articles
    const articles = await this.prisma.kbArticle.findMany({
      where: {
        orgId,
        isPublished: true,
        deletedAt: null,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { body: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: query.toLowerCase().split(/\s+/).filter((w) => w.length > 2) } },
        ],
      },
      select: { id: true, title: true, slug: true, body: true, tags: true },
      take: 5,
      orderBy: { viewCount: 'desc' },
    });

    if (articles.length === 0) {
      return { answer: '', sources: [], confidence: 0 };
    }

    // Step 2: Build context from articles
    const context = articles
      .map((a, i) => `[Article ${i + 1}: "${sanitizePromptInput(a.title, 200)}"]\n${a.body.slice(0, 1500)}`)
      .join('\n\n---\n\n');

    // Step 3: Generate answer using AI with article context
    const orgContextStr = await this.orgContext.getContext(orgId);
    const BASE_SYSTEM_PROMPT = `You are a helpful support assistant. Answer the user's question using ONLY the provided knowledge base articles. If the articles don't contain enough information, say so.

Return ONLY valid JSON:
{
  "answer": "Your helpful answer based on the articles",
  "relevantArticles": [1, 2],  // indices (1-based) of articles you used
  "confidence": 0.0-1.0  // how confident you are the answer is correct
}`;
    const result = await this.aiProvider.complete({
      systemPrompt: orgContextStr ? `${orgContextStr}\n\n---\n\n${BASE_SYSTEM_PROMPT}` : BASE_SYSTEM_PROMPT,
      userPrompt: `Knowledge Base Articles:\n${context}\n\n---\n\nUser Question: ${query}`,
      maxTokens: 800,
    });

    try {
      const parsed = JSON.parse(result.text);
      const relevantIndices: number[] = Array.isArray(parsed.relevantArticles) ? parsed.relevantArticles : [];

      const sources = relevantIndices
        .filter((i) => i >= 1 && i <= articles.length)
        .map((i) => {
          const article = articles[i - 1];
          return {
            articleId: article.id,
            title: article.title,
            slug: article.slug,
            relevance: 1 - (i - 1) * 0.1,
          };
        });

      // Increment view count for used articles
      for (const source of sources) {
        await this.prisma.kbArticle.update({
          where: { id: source.articleId },
          data: { viewCount: { increment: 1 } },
        });
      }

      return {
        answer: parsed.answer || '',
        sources,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      };
    } catch {
      return { answer: '', sources: [], confidence: 0 };
    }
  }

  /**
   * Suggest KB articles for an active conversation (agent assist).
   */
  async suggestForConversation(conversationId: string, orgId: string): Promise<KbRagResult> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId, orgId, direction: 'INBOUND' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { body: true },
    });

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
