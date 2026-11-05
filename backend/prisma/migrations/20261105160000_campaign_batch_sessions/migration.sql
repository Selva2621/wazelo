ALTER TABLE "campaign_recipients"
ADD COLUMN "session_id" UUID;

UPDATE "campaign_recipients" AS recipient
SET "session_id" = campaign."session_id"
FROM "campaigns" AS campaign
WHERE recipient."campaign_id" = campaign."id"
  AND campaign."session_id" IS NOT NULL;

ALTER TABLE "campaign_recipients"
ADD CONSTRAINT "campaign_recipients_session_id_fkey"
FOREIGN KEY ("session_id") REFERENCES "whatsapp_sessions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "campaign_recipients_campaign_id_batch_number_session_id_idx"
ON "campaign_recipients"("campaign_id", "batch_number", "session_id");
