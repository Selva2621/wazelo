-- Add business profile fields to organizations
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "industry"    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "description" VARCHAR(2000),
  ADD COLUMN IF NOT EXISTS "website"     VARCHAR(500);

-- Create org_ai_memories table
CREATE TABLE "org_ai_memories" (
  "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
  "org_id"         UUID         NOT NULL,
  "business_name"  VARCHAR(255),
  "industry"       VARCHAR(100),
  "description"    VARCHAR(2000),
  "website"        VARCHAR(500),
  "products_json"  TEXT,
  "kb_summary"     TEXT,
  "shopify_store"  VARCHAR(255),
  "custom_context" VARCHAR(2000),
  "built_at"       TIMESTAMPTZ,
  "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "org_ai_memories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "org_ai_memories_org_id_key" UNIQUE ("org_id"),
  CONSTRAINT "org_ai_memories_org_id_fkey" FOREIGN KEY ("org_id")
    REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
