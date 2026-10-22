import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export interface ChunkHit {
  id: string;
  documentId: string | null;
  articleId: string | null;
  title: string | null;
  content: string;
  /** Page URL for website passages */
  sourceUrl: string | null;
  rank: number;
}

/** Common words that match everything and only add noise to an OR query */
const STOPWORDS = new Set(
  'a an and are as at be by can do does for from have hi hello how i if in is it me my of on or our please so that the this to was we what when where which who why will with you your'.split(' '),
);

/** Meaningful word tokens of a question (any script), stopwords and 1-letter tokens dropped. */
function queryWords(question: string): string[] {
  // \p{M}: vowel signs (Tamil, Hindi…) are marks, not letters — without them words split
  const tokens = question.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? ([] as string[]);
  return [...new Set(tokens.filter((w) => w.length > 1 && !STOPWORDS.has(w)))].slice(0, 12);
}

/** Prefix-match longer words ("deliver" → "delivery"); short ones exactly ("pro" ≠ "product"). */
const term = (w: string) => ([...w].length >= 4 ? `${w}:*` : w);

/**
 * Full-text queries for a chat question: `any` (OR — finds passages with some of the
 * words) and `all` (AND — passages with every word rank first). Null when nothing is left.
 */
export function toTsQuery(question: string): string | null {
  const words = queryWords(question);
  return words.length ? words.map(term).join(' | ') : null;
}

export function toTsQueryAll(question: string): string | null {
  const words = queryWords(question);
  return words.length ? words.map(term).join(' & ') : null;
}

/** Searchable passages of KB documents/articles (Postgres full-text, see kb_chunks). */
@Injectable()
export class KbChunkRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Replaces a document's passages. */
  async replaceForDocument(orgId: string, documentId: string, title: string | null, chunks: string[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.kbChunk.deleteMany({ where: { documentId } }),
      ...(chunks.length
        ? [
            this.prisma.kbChunk.createMany({
              data: chunks.map((content, position) => ({ id: randomUUID(), orgId, documentId, title, content, position })),
            }),
          ]
        : []),
    ]);
  }

  /** Replaces an article's passages (articles have no FK; removed when unpublished/deleted). */
  async replaceForArticle(orgId: string, articleId: string, title: string, chunks: string[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.kbChunk.deleteMany({ where: { articleId } }),
      ...(chunks.length
        ? [
            this.prisma.kbChunk.createMany({
              data: chunks.map((content, position) => ({ id: randomUUID(), orgId, articleId, title, content, position })),
            }),
          ]
        : []),
    ]);
  }

  async deleteForArticle(articleId: string): Promise<void> {
    await this.prisma.kbChunk.deleteMany({ where: { articleId } });
  }

  /**
   * Best passages for a question within an org, from READY documents (optionally
   * only those of one chatbot flow plus org-wide ones) and published public articles.
   */
  async search(orgId: string, question: string, limit = 6, opts: { flowId?: string } = {}): Promise<ChunkHit[]> {
    const tsq = toTsQuery(question);
    const tsqAll = toTsQueryAll(question);
    if (!tsq || !tsqAll) return [];
    const flowFilter = opts.flowId
      ? Prisma.sql`AND (d.flow_id IS NULL OR d.flow_id = ${opts.flowId}::uuid)`
      : Prisma.empty;
    return this.prisma.$queryRaw<ChunkHit[]>`
      SELECT c.id, c.document_id AS "documentId", c.article_id AS "articleId", c.title, c.content,
             d.source_url AS "sourceUrl",
             ts_rank_cd(c.search, q) AS rank
      FROM kb_chunks c
      CROSS JOIN to_tsquery('simple', ${tsq}) q
      CROSS JOIN to_tsquery('simple', ${tsqAll}) qall
      LEFT JOIN kb_documents d ON d.id = c.document_id
      LEFT JOIN kb_articles a ON a.id = c.article_id
      WHERE c.org_id = ${orgId}::uuid
        AND c.search @@ q
        AND (
          (c.document_id IS NOT NULL AND d.deleted_at IS NULL AND d.status = 'READY' ${flowFilter})
          OR (c.article_id IS NOT NULL AND a.deleted_at IS NULL AND a.is_published = true AND a.is_internal = false)
        )
      -- Passages with every word first, then by how densely they match
      ORDER BY (c.search @@ qall) DESC, rank DESC
      LIMIT ${limit}`;
  }

  async countForOrg(orgId: string): Promise<number> {
    return this.prisma.kbChunk.count({ where: { orgId } });
  }
}
