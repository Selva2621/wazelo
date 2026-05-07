-- Fix: Replace the regular unique index with a partial unique index.
-- PostgreSQL treats NULL as distinct in regular unique indexes, so
-- (org_id, phone_number, NULL) can have multiple rows.

-- Step 1: Drop the existing (broken) unique index FIRST to avoid constraint
-- violations during dedup
DROP INDEX IF EXISTS "contacts_org_id_phone_number_deleted_at_key";

-- Step 2: Deduplicate existing contacts — keep the oldest, soft-delete the rest
-- Use unique timestamps per row to avoid conflicts
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY org_id, phone_number
    ORDER BY created_at ASC
  ) AS rn
  FROM contacts
  WHERE deleted_at IS NULL
)
UPDATE contacts
SET deleted_at = NOW() + (rn || ' milliseconds')::interval,
    updated_at = NOW()
FROM ranked
WHERE contacts.id = ranked.id AND ranked.rn > 1;

-- Step 3: Create a partial unique index for active contacts
CREATE UNIQUE INDEX "contacts_org_phone_active_unique"
  ON "contacts" ("org_id", "phone_number")
  WHERE "deleted_at" IS NULL;
