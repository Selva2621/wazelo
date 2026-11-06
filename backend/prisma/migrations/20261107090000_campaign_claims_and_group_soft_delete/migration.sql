-- When a recipient was handed to a sender. Lets the scheduler find recipients
-- stuck in QUEUED after a crash or a missed send event.
ALTER TABLE "campaign_recipients" ADD COLUMN "claimed_at" TIMESTAMP(3);
CREATE INDEX "campaign_recipients_campaign_id_status_claimed_at_idx"
    ON "campaign_recipients"("campaign_id", "status", "claimed_at");

-- Saved contact groups: soft delete. A deleted group frees its name.
ALTER TABLE "saved_contact_groups" ADD COLUMN "deleted_at" TIMESTAMP(3);
DROP INDEX IF EXISTS "saved_contact_groups_org_id_name_key";
-- Partial unique index (not expressible in schema.prisma; keep it, do not drop)
CREATE UNIQUE INDEX "saved_contact_groups_org_id_name_active_key"
    ON "saved_contact_groups"("org_id", "name")
    WHERE "deleted_at" IS NULL;
CREATE INDEX "saved_contact_groups_org_id_deleted_at_idx"
    ON "saved_contact_groups"("org_id", "deleted_at");
