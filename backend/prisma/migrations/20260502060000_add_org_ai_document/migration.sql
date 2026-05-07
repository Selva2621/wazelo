-- Add document text fields to org_ai_memories
ALTER TABLE "org_ai_memories"
  ADD COLUMN IF NOT EXISTS "document_text" TEXT,
  ADD COLUMN IF NOT EXISTS "document_name" VARCHAR(255);
