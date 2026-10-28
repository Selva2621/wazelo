import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { KbChunkRepository } from '@/modules/knowledge-base/infrastructure/repositories/kb-chunk.repository';
import { EmbeddingService, toVectorLiteral } from '@/modules/ai/domain/services/embedding.service';

/** Passages embedded per minute, and per API call */
const PER_RUN = 64;
const PER_CALL = 32;

/**
 * Gives every knowledge passage a meaning vector, a little at a time: new website
 * pages, files and FAQs as they're indexed, and the existing ones once after
 * embeddings are switched on. Does nothing when no embeddings key is set.
 */
@Injectable()
export class KbEmbeddingWorker {
  private readonly logger = new Logger(KbEmbeddingWorker.name);
  private running = false;

  constructor(
    private readonly chunks: KbChunkRepository,
    private readonly embeddings: EmbeddingService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    if (this.running) return; // a slow run never overlaps the next
    this.running = true;
    try {
      await this.run();
    } catch (err) {
      this.logger.warn(`Embedding run failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  /** Returns how many passages got a vector. */
  async run(): Promise<number> {
    if (!(await this.embeddings.connection())) return 0;
    const pending = await this.chunks.findUnembedded(PER_RUN);
    let done = 0;
    for (let i = 0; i < pending.length; i += PER_CALL) {
      const batch = pending.slice(i, i + PER_CALL);
      const vectors = await this.embeddings.embed(batch.map((c) => (c.title ? `${c.title}\n${c.content}` : c.content)));
      if (!vectors) break; // provider down or out of quota: try again next minute
      for (let j = 0; j < batch.length; j++) {
        await this.chunks.setEmbedding(batch[j].id, toVectorLiteral(vectors[j]));
        done++;
      }
    }
    if (done) this.logger.log(`Embedded ${done} knowledge passage(s)`);
    return done;
  }
}
