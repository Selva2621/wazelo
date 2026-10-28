-- Knowledge search by meaning: pgvector + one vector per passage (additive only)

-- Extension (Neon ships pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "kb_chunks" ADD COLUMN "embedding" vector(768);

-- Fast nearest-neighbour search by cosine distance
CREATE INDEX "kb_chunks_embedding_idx" ON "kb_chunks" USING hnsw ("embedding" vector_cosine_ops);
