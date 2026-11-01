-- One set of AI instructions for WhatsApp and the website chat.
-- The widget's own "Custom instructions" move into the shared instructions
-- (org_ai_memories.custom_context, "Rules & tone"), so nothing the owner wrote is lost.

-- Orgs that already have AI memory: add the widget text below what's there (unless it's already in it)
UPDATE "org_ai_memories" m
SET "custom_context" = LEFT(
      CASE
        WHEN COALESCE(TRIM(m."custom_context"), '') = '' THEN TRIM(w."ai_system_prompt")
        ELSE m."custom_context" || E'\n\n' || TRIM(w."ai_system_prompt")
      END,
      2000),
    "updated_at" = NOW()
FROM "widget_configs" w
WHERE w."org_id" = m."org_id"
  AND COALESCE(TRIM(w."ai_system_prompt"), '') <> ''
  AND POSITION(TRIM(w."ai_system_prompt") IN COALESCE(m."custom_context", '')) = 0;

-- Orgs without AI memory yet: start it with the widget text
INSERT INTO "org_ai_memories" ("id", "org_id", "custom_context", "created_at", "updated_at")
SELECT gen_random_uuid(), w."org_id", LEFT(TRIM(w."ai_system_prompt"), 2000), NOW(), NOW()
FROM "widget_configs" w
WHERE COALESCE(TRIM(w."ai_system_prompt"), '') <> ''
  AND NOT EXISTS (SELECT 1 FROM "org_ai_memories" m WHERE m."org_id" = w."org_id");

-- The widget no longer has its own instructions
UPDATE "widget_configs" SET "ai_system_prompt" = NULL WHERE "ai_system_prompt" IS NOT NULL;
