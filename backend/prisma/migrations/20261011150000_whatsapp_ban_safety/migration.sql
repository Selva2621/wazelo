-- Baileys ban safety: disconnect classification + send-rate indexes. Additive only.

-- AlterTable
ALTER TABLE "whatsapp_sessions" ADD COLUMN "disconnect_code" INTEGER;
ALTER TABLE "whatsapp_sessions" ADD COLUMN "disconnect_reason" VARCHAR(30);
ALTER TABLE "whatsapp_sessions" ADD COLUMN "linked_at" TIMESTAMP(3);

-- Backfill: existing numbers count as linked when the session was created
UPDATE "whatsapp_sessions" SET "linked_at" = "created_at" WHERE "phone_number" IS NOT NULL;

-- CreateIndex: rate limiter counts by sent_at, not created_at
CREATE INDEX "messages_session_id_sent_at_idx" ON "messages"("session_id", "sent_at");
CREATE INDEX "messages_org_id_sent_at_idx" ON "messages"("org_id", "sent_at");
