-- Knowledge from websites + full-text search over passages.
-- kb_sources: a website an org asked us to learn from (crawled into kb_documents).
-- kb_chunks: searchable passages of documents and articles; `search` is generated
-- from title + content with the 'simple' config so Tamil/Hindi/English all index.

ALTER TABLE "kb_documents" ADD COLUMN "source_type" VARCHAR(20) NOT NULL DEFAULT 'UPLOAD';
ALTER TABLE "kb_documents" ADD COLUMN "source_id" UUID;
ALTER TABLE "kb_documents" ADD COLUMN "source_url" TEXT;

CREATE TABLE "kb_sources" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'WEBSITE',
    "url" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    "pages_found" INTEGER NOT NULL DEFAULT 0,
    "pages_done" INTEGER NOT NULL DEFAULT 0,
    "error" VARCHAR(500),
    "last_synced_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "kb_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kb_chunks" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "document_id" UUID,
    "article_id" UUID,
    "position" INTEGER NOT NULL DEFAULT 0,
    "title" VARCHAR(500),
    "content" TEXT NOT NULL,
    "search" tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
        setweight(to_tsvector('simple', "content"), 'B')
    ) STORED,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_chunks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "kb_documents_source_id_idx" ON "kb_documents"("source_id");
CREATE INDEX "kb_sources_org_id_idx" ON "kb_sources"("org_id");
CREATE INDEX "kb_chunks_org_id_idx" ON "kb_chunks"("org_id");
CREATE INDEX "kb_chunks_document_id_idx" ON "kb_chunks"("document_id");
CREATE INDEX "kb_chunks_article_id_idx" ON "kb_chunks"("article_id");
CREATE INDEX "kb_chunks_search_idx" ON "kb_chunks" USING GIN ("search");

ALTER TABLE "kb_documents" ADD CONSTRAINT "kb_documents_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "kb_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kb_sources" ADD CONSTRAINT "kb_sources_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kb_chunks" ADD CONSTRAINT "kb_chunks_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kb_chunks" ADD CONSTRAINT "kb_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "kb_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
