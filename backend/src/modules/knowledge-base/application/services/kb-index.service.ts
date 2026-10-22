import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { KbChunkRepository } from '../../infrastructure/repositories/kb-chunk.repository';
import { chunkText } from '../../domain/services/chunk-text';

/** Markdown markers that only add noise to search ("**Price:**" → "Price:") */
function plainText(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[*_`#>~]+/g, '')
    .replace(/^\s*[-+]\s+/gm, '');
}

const BACKFILL_BATCH = 200;

/**
 * Keeps kb_chunks (the searchable passages) in step with uploaded documents and
 * published articles. Website pages are indexed by the crawl itself.
 */
@Injectable()
export class KbIndexService implements OnApplicationBootstrap {
  private readonly logger = new Logger(KbIndexService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chunks: KbChunkRepository,
  ) {}

  async indexDocument(orgId: string, documentId: string, title: string, text: string): Promise<void> {
    await this.chunks.replaceForDocument(orgId, documentId, title, chunkText(text));
  }

  async removeDocument(documentId: string): Promise<void> {
    await this.prisma.kbChunk.deleteMany({ where: { documentId } });
  }

  /** Published public articles are searchable; anything else (draft, internal, deleted) is not. */
  async indexArticle(articleId: string): Promise<void> {
    const article = await this.prisma.kbArticle.findUnique({
      where: { id: articleId },
      select: { id: true, orgId: true, title: true, body: true, isPublished: true, isInternal: true, deletedAt: true },
    });
    if (!article || article.deletedAt || !article.isPublished || article.isInternal) {
      await this.chunks.deleteForArticle(articleId);
      return;
    }
    await this.chunks.replaceForArticle(article.orgId, article.id, article.title, chunkText(plainText(article.body)));
  }

  /** Indexes READY documents and published articles that have no passages yet (data from before kb_chunks). */
  async onApplicationBootstrap(): Promise<void> {
    // Not awaited: boot must not wait on a backfill
    void this.backfill().catch((err) => this.logger.error(`KB backfill failed: ${(err as Error).message}`));
  }

  async backfill(): Promise<{ documents: number; articles: number }> {
    const docs = await this.prisma.kbDocument.findMany({
      where: { status: 'READY', deletedAt: null, extractedText: { not: null }, chunks: { none: {} } },
      select: { id: true, orgId: true, title: true, extractedText: true },
      take: BACKFILL_BATCH,
    });
    for (const d of docs) await this.indexDocument(d.orgId, d.id, d.title, d.extractedText ?? '');

    const articles = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT a.id FROM kb_articles a
      WHERE a.deleted_at IS NULL AND a.is_published = true AND a.is_internal = false
        AND NOT EXISTS (SELECT 1 FROM kb_chunks c WHERE c.article_id = a.id)
      LIMIT ${BACKFILL_BATCH}`;
    for (const a of articles) await this.indexArticle(a.id);

    if (docs.length || articles.length) {
      this.logger.log(`KB backfill: indexed ${docs.length} document(s), ${articles.length} article(s)`);
    }
    return { documents: docs.length, articles: articles.length };
  }
}
