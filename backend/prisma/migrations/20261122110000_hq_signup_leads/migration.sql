-- Sign-ups become Wazelo HQ leads: their WhatsApp number and consent
ALTER TABLE "users" ADD COLUMN "phone" VARCHAR(20);
ALTER TABLE "users" ADD COLUMN "whatsapp_opt_in_at" TIMESTAMP(3);

ALTER TYPE "ContactSource" ADD VALUE 'SIGNUP';
