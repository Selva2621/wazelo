import { Injectable } from '@nestjs/common';
import { KbChunkRepository, ChunkHit } from '@/modules/knowledge-base/infrastructure/repositories/kb-chunk.repository';
import { EmbeddingService, toVectorLiteral } from './embedding.service';

/** Standard reciprocal-rank-fusion constant: how much lower ranks still count */
const RRF_K = 60;
/**
 * A passage found only by meaning must be at least this similar (cosine, 0–1).
 * text-embedding-3-small scores good matches around 0.2–0.4 (measured on real
 * site pages: "can I talk to someone" → Contact page 0.34), unrelated ones lower.
 */
const MIN_SIMILARITY = 0.2;

/**
 * The one way every AI feature searches the business's knowledge: keyword matches
 * (exact words, names, prices) plus meaning matches ("cost" ↔ "pricing"), merged.
 * Without embeddings it is exactly the keyword search. Both searches carry the same
 * workspace / visibility filters, so nothing private or from another org comes back.
 */
@Injectable()
export class KnowledgeSearchService {
  constructor(
    private readonly chunks: KbChunkRepository,
    private readonly embeddings: EmbeddingService,
  ) {}

  async search(orgId: string, question: string, limit = 6, opts: { flowId?: string } = {}): Promise<ChunkHit[]> {
    const [keyword, vectors] = await Promise.all([
      this.chunks.search(orgId, question, limit * 2, opts),
      this.embeddings.embed([question]).catch(() => null),
    ]);
    const vector = vectors?.[0];
    if (!vector) return keyword.slice(0, limit);

    const found: ChunkHit[] = await this.chunks
      .searchByVector(orgId, toVectorLiteral(vector), limit * 2, opts)
      .catch(() => []);
    const semantic = found.filter((h) => Number(h.rank) >= MIN_SIMILARITY);
    return fuse([keyword, semantic], limit);
  }
}

/** Reciprocal rank fusion: passages high in either list (or in both) come first. */
export function fuse(lists: ChunkHit[][], limit: number): ChunkHit[] {
  const scored = new Map<string, { hit: ChunkHit; score: number }>();
  for (const list of lists) {
    list.forEach((hit, i) => {
      const entry = scored.get(hit.id) ?? { hit, score: 0 };
      entry.score += 1 / (RRF_K + i + 1);
      scored.set(hit.id, entry);
    });
  }
  return [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ hit, score }) => ({ ...hit, rank: score }));
}
