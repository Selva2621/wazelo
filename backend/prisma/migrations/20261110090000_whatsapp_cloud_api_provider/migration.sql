-- Official WhatsApp numbers (Meta Cloud API) next to QR-linked ones
CREATE TYPE "WhatsAppProvider" AS ENUM ('QR', 'CLOUD_API');

ALTER TABLE "whatsapp_sessions"
  ADD COLUMN "provider" "WhatsAppProvider" NOT NULL DEFAULT 'QR',
  ADD COLUMN "cloud_phone_number_id" VARCHAR(64),
  ADD COLUMN "cloud_waba_id" VARCHAR(64),
  ADD COLUMN "encrypted_cloud_token" TEXT,
  ADD COLUMN "encrypted_cloud_app_secret" TEXT,
  ADD COLUMN "cloud_verify_token" VARCHAR(100),
  ADD COLUMN "cloud_verified_name" VARCHAR(255),
  ADD COLUMN "cloud_quality_rating" VARCHAR(20),
  ADD COLUMN "cloud_messaging_tier" VARCHAR(40);

-- One QR number per user; an admin can also add official numbers
DROP INDEX IF EXISTS "whatsapp_sessions_user_id_deleted_at_key";
CREATE UNIQUE INDEX "whatsapp_sessions_user_id_provider_deleted_at_key"
  ON "whatsapp_sessions"("user_id", "provider", "deleted_at");

CREATE INDEX "whatsapp_sessions_cloud_phone_number_id_idx"
  ON "whatsapp_sessions"("cloud_phone_number_id");
