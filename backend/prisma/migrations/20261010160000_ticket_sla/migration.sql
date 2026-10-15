-- Ticket SLA tracking: first support response and who replied last.

-- AlterTable
ALTER TABLE "help_tickets"
  ADD COLUMN "first_response_at" TIMESTAMP(3),
  ADD COLUMN "last_reply_by" VARCHAR(10),
  ADD COLUMN "last_reply_at" TIMESTAMP(3);

-- Backfill from existing visible (non-internal) replies
UPDATE "help_tickets" t SET "first_response_at" = r.first_at
FROM (
  SELECT "ticket_id", MIN("created_at") AS first_at
  FROM "ticket_replies"
  WHERE "super_admin_id" IS NOT NULL AND "is_internal" = false
  GROUP BY "ticket_id"
) r
WHERE r."ticket_id" = t."id";

UPDATE "help_tickets" t
SET "last_reply_at" = r."created_at",
    "last_reply_by" = CASE WHEN r."super_admin_id" IS NOT NULL THEN 'SUPPORT' ELSE 'CUSTOMER' END
FROM (
  SELECT DISTINCT ON ("ticket_id") "ticket_id", "created_at", "super_admin_id"
  FROM "ticket_replies"
  WHERE "is_internal" = false
  ORDER BY "ticket_id", "created_at" DESC
) r
WHERE r."ticket_id" = t."id";

-- CreateIndex
CREATE INDEX "help_tickets_last_reply_by_status_idx" ON "help_tickets"("last_reply_by", "status");
