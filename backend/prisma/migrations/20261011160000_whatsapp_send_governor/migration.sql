-- Baileys send-safety governor: auto-pause of bulk sending per number. Additive only.

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'WHATSAPP_BULK_SENDING_PAUSED';
ALTER TYPE "AuditAction" ADD VALUE 'WHATSAPP_BULK_SENDING_RESUMED';

-- AlterTable
ALTER TABLE "whatsapp_sessions" ADD COLUMN "sending_paused_until" TIMESTAMP(3);
ALTER TABLE "whatsapp_sessions" ADD COLUMN "sending_paused_reason" VARCHAR(300);
ALTER TABLE "whatsapp_sessions" ADD COLUMN "health_reset_at" TIMESTAMP(3);

-- CreateIndex: warm/cold checks look up inbound messages by org + phone
CREATE INDEX IF NOT EXISTS "messages_org_id_contact_phone_direction_idx" ON "messages"("org_id", "contact_phone", "direction");
