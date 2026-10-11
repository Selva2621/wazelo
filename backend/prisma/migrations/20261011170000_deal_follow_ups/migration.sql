-- Deal follow-up reminders for the freelancer pipeline. Additive only.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'DEAL_FOLLOW_UP_DUE';
ALTER TYPE "NotificationType" ADD VALUE 'DEAL_SCOPE_RESPONSE';

-- AlterTable
ALTER TABLE "deals" ADD COLUMN "next_follow_up_at" TIMESTAMP(3);
ALTER TABLE "deals" ADD COLUMN "follow_up_note" VARCHAR(500);
ALTER TABLE "deals" ADD COLUMN "follow_up_notified_at" TIMESTAMP(3);

-- Scope lock (approval via WhatsApp poll)
ALTER TABLE "deals" ADD COLUMN "scope_summary" TEXT;
ALTER TABLE "deals" ADD COLUMN "scope_status" VARCHAR(20);
ALTER TABLE "deals" ADD COLUMN "scope_sent_at" TIMESTAMP(3);
ALTER TABLE "deals" ADD COLUMN "scope_responded_at" TIMESTAMP(3);
ALTER TABLE "deals" ADD COLUMN "scope_poll_message_id" VARCHAR(255);
ALTER TABLE "deals" ADD COLUMN "scope_poll_secret" VARCHAR(128);
CREATE UNIQUE INDEX "deals_scope_poll_message_id_key" ON "deals"("scope_poll_message_id");

-- CreateIndex
CREATE INDEX "deals_org_id_next_follow_up_at_idx" ON "deals"("org_id", "next_follow_up_at");

-- Backfill: existing FREELANCER orgs get the "Client Deals" pipeline as their default
-- (new ones get it from onboarding). Mirrors FREELANCER_PIPELINE in shared/constants/org-defaults.ts.
CREATE TEMP TABLE "_freelancer_pipelines" AS
SELECT gen_random_uuid() AS "id", o."id" AS "org_id"
FROM "organizations" o
WHERE o."org_type" = 'FREELANCER'
  AND NOT EXISTS (
    SELECT 1 FROM "pipelines" p
    WHERE p."org_id" = o."id" AND p."name" = 'Client Deals' AND p."deleted_at" IS NULL
  );

UPDATE "pipelines" SET "is_default" = false
WHERE "org_id" IN (SELECT "org_id" FROM "_freelancer_pipelines") AND "is_default" = true;

INSERT INTO "pipelines" ("id", "org_id", "name", "description", "is_default", "created_at", "updated_at")
SELECT "id", "org_id", 'Client Deals', 'Freelancer pipeline — from first message to advance paid', true, NOW(), NOW()
FROM "_freelancer_pipelines";

INSERT INTO "pipeline_stages" ("id", "pipeline_id", "name", "order", "color", "is_won_stage", "is_lost_stage", "created_at")
SELECT gen_random_uuid(), fp."id", s."name", s."order", s."color", s."won", s."lost", NOW()
FROM "_freelancer_pipelines" fp
CROSS JOIN (VALUES
  ('New lead', 0, '#64748b', false, false),
  ('Qualified', 1, '#6366f1', false, false),
  ('Discovery call', 2, '#0ea5e9', false, false),
  ('Proposal sent', 3, '#f59e0b', false, false),
  ('Negotiation', 4, '#3b82f6', false, false),
  ('Advance paid', 5, '#14b8a6', false, false),
  ('Won', 6, '#22c55e', true, false),
  ('Lost', 7, '#ef4444', false, true)
) AS s("name", "order", "color", "won", "lost");

DROP TABLE "_freelancer_pipelines";
