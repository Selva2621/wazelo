-- Email as a second channel: the workspace's own SMTP mailbox, email templates,
-- a log of every email, email campaigns, email sequence steps and a "Send email" automation.

ALTER TYPE "AutomationActionType" ADD VALUE IF NOT EXISTS 'SEND_EMAIL';

-- The workspace's email account (one per workspace)
CREATE TABLE "email_accounts" (
  "id" UUID NOT NULL,
  "org_id" UUID NOT NULL,
  "provider" VARCHAR(10) NOT NULL DEFAULT 'CUSTOM',
  "host" VARCHAR(255) NOT NULL,
  "port" INTEGER NOT NULL DEFAULT 587,
  "secure" BOOLEAN NOT NULL DEFAULT false,
  "username" VARCHAR(320) NOT NULL,
  "encrypted_password" TEXT NOT NULL,
  "from_name" VARCHAR(255) NOT NULL,
  "from_address" VARCHAR(320) NOT NULL,
  "reply_to" VARCHAR(320),
  "status" VARCHAR(12) NOT NULL DEFAULT 'UNVERIFIED',
  "last_error" VARCHAR(500),
  "verified_at" TIMESTAMP(3),
  "daily_limit" INTEGER NOT NULL DEFAULT 300,
  "sent_today" INTEGER NOT NULL DEFAULT 0,
  "sent_day" DATE,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "email_accounts_org_id_key" ON "email_accounts"("org_id");

-- Email templates
CREATE TABLE "email_templates" (
  "id" UUID NOT NULL,
  "org_id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "subject" VARCHAR(255) NOT NULL,
  "body" TEXT NOT NULL,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "email_templates_org_id_deleted_at_idx" ON "email_templates"("org_id", "deleted_at");

-- Every email sent
CREATE TABLE "email_messages" (
  "id" UUID NOT NULL,
  "org_id" UUID NOT NULL,
  "contact_id" UUID,
  "to_address" VARCHAR(320) NOT NULL,
  "subject" VARCHAR(255) NOT NULL,
  "body" TEXT NOT NULL,
  "status" VARCHAR(10) NOT NULL DEFAULT 'QUEUED',
  "error" VARCHAR(500),
  "source" VARCHAR(12) NOT NULL,
  "source_id" UUID,
  "provider_message_id" VARCHAR(255),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "idempotency_key" VARCHAR(255) NOT NULL,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "email_messages_idempotency_key_key" ON "email_messages"("idempotency_key");
CREATE INDEX "email_messages_org_id_created_at_idx" ON "email_messages"("org_id", "created_at");
CREATE INDEX "email_messages_org_id_status_idx" ON "email_messages"("org_id", "status");
CREATE INDEX "email_messages_source_source_id_idx" ON "email_messages"("source", "source_id");
CREATE INDEX "email_messages_contact_id_idx" ON "email_messages"("contact_id");

-- Contacts can unsubscribe from email (WhatsApp opt-out stays separate)
ALTER TABLE "contacts"
  ADD COLUMN "email_opted_out" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "email_opted_out_at" TIMESTAMP(3);

-- Email campaigns
ALTER TABLE "campaigns"
  ADD COLUMN "channel" "ChannelType" NOT NULL DEFAULT 'WHATSAPP',
  ADD COLUMN "email_subject" VARCHAR(255),
  ALTER COLUMN "session_id" DROP NOT NULL;
ALTER TABLE "campaign_recipients" ADD COLUMN "email_message_id" UUID;
CREATE UNIQUE INDEX "campaign_recipients_email_message_id_key" ON "campaign_recipients"("email_message_id");

-- Email sequence steps
ALTER TABLE "campaign_sequence_steps"
  ADD COLUMN "channel" "ChannelType" NOT NULL DEFAULT 'WHATSAPP',
  ADD COLUMN "email_subject" VARCHAR(255);
