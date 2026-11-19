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

  /**
   * Closest passages by meaning (pgvector cosine distance), with exactly the same
   * workspace and visibility filters as `search`. `vector` is pgvector text "[…]".
   */
  async searchByVector(orgId: string, vector: string, limit = 6, opts: { flowId?: string } = {}): Promise<ChunkHit[]> {
    const flowFilter = opts.flowId
      ? Prisma.sql`AND (d.flow_id IS NULL OR d.flow_id = ${opts.flowId}::uuid)`
      : Prisma.empty;
    // One HNSW index serves every org. By default it only looks at the ~40 nearest
    // vectors of ALL orgs and then applies the org filter, so a small org could get
    // few or no results once many orgs share the table (never another org's rows,
    // just fewer of its own). Iterative scan keeps searching until enough of this
    // org's passages pass the filter; SET LOCAL limits it to this transaction.
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL hnsw.iterative_scan = relaxed_order`;
      await tx.$executeRaw`SET LOCAL hnsw.ef_search = 100`;
      // relaxed_order can return near-ties slightly out of order: re-sort the final few
      return tx.$queryRaw<ChunkHit[]>`
        WITH nearest AS MATERIALIZED (
          SELECT c.id, c.document_id AS "documentId", c.article_id AS "articleId", c.title, c.content,
                 d.source_url AS "sourceUrl",
                 c.embedding <=> ${vector}::vector AS distance
          FROM kb_chunks c
          LEFT JOIN kb_documents d ON d.id = c.document_id
          LEFT JOIN kb_articles a ON a.id = c.article_id
          WHERE c.org_id = ${orgId}::uuid
            AND c.embedding IS NOT NULL
            AND (
              (c.document_id IS NOT NULL AND d.deleted_at IS NULL AND d.status = 'READY' ${flowFilter})
              OR (c.article_id IS NOT NULL AND a.deleted_at IS NULL AND a.is_published = true AND a.is_internal = false)
            )
          ORDER BY c.embedding <=> ${vector}::vector
          LIMIT ${limit}
        )
        SELECT id, "documentId", "articleId", title, content, "sourceUrl", 1 - distance AS rank
        FROM nearest
        ORDER BY distance`;
    });
  }

  /** Passages still waiting for a meaning vector (new or re-read ones), oldest first. */
  async findUnembedded(limit: number): Promise<{ id: string; title: string | null; content: string }[]> {
    return this.prisma.$queryRaw<{ id: string; title: string | null; content: string }[]>`
      SELECT id, title, content FROM kb_chunks
      WHERE embedding IS NULL
      ORDER BY created_at ASC
      LIMIT ${limit}`;
  }

  async setEmbedding(id: string, vector: string): Promise<void> {
    await this.prisma.$executeRaw`UPDATE kb_chunks SET embedding = ${vector}::vector WHERE id = ${id}::uuid`;
  }

  async countForOrg(orgId: string): Promise<number> {
    return this.prisma.kbChunk.count({ where: { orgId } });
  }
}
