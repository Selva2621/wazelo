-- CreateEnum
CREATE TYPE "WhatsAppSessionStatus" AS ENUM ('CONNECTING', 'CONNECTED', 'DISCONNECTED', 'RECONNECTING');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO', 'STICKER', 'LOCATION', 'CONTACT');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'WHATSAPP_QR_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'WHATSAPP_SESSION_CONNECTED';
ALTER TYPE "AuditAction" ADD VALUE 'WHATSAPP_SESSION_DISCONNECTED';
ALTER TYPE "AuditAction" ADD VALUE 'WHATSAPP_SESSION_RECONNECTING';
ALTER TYPE "AuditAction" ADD VALUE 'WHATSAPP_SESSION_FORCE_DISCONNECTED';
ALTER TYPE "AuditAction" ADD VALUE 'WHATSAPP_UNAUTHORIZED_ATTEMPT';
ALTER TYPE "AuditAction" ADD VALUE 'WHATSAPP_MESSAGE_SENT';
ALTER TYPE "AuditAction" ADD VALUE 'WHATSAPP_MESSAGE_FAILED';

-- CreateTable
CREATE TABLE "whatsapp_sessions" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "phone_number" VARCHAR(20),
    "status" "WhatsAppSessionStatus" NOT NULL DEFAULT 'CONNECTING',
    "encrypted_creds" TEXT,
    "last_active_at" TIMESTAMP(3),
    "last_heartbeat_at" TIMESTAMP(3),
    "reconnect_count" INTEGER NOT NULL DEFAULT 0,
    "idempotency_key" VARCHAR(255),
    "disconnected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "whatsapp_message_id" VARCHAR(255),
    "direction" "MessageDirection" NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "contact_phone" VARCHAR(20) NOT NULL,
    "contact_name" VARCHAR(255),
    "body" TEXT,
    "media_url" VARCHAR(2048),
    "media_mime_type" VARCHAR(100),
    "media_size" INTEGER,
    "metadata" JSONB,
    "idempotency_key" VARCHAR(255),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "failed_reason" TEXT,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_auth_keys" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "key_type" VARCHAR(100) NOT NULL,
    "key_id" VARCHAR(255) NOT NULL,
    "key_data" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_auth_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_sessions_idempotency_key_key" ON "whatsapp_sessions"("idempotency_key");

-- CreateIndex
CREATE INDEX "whatsapp_sessions_org_id_idx" ON "whatsapp_sessions"("org_id");

-- CreateIndex
CREATE INDEX "whatsapp_sessions_user_id_idx" ON "whatsapp_sessions"("user_id");

-- CreateIndex
CREATE INDEX "whatsapp_sessions_status_idx" ON "whatsapp_sessions"("status");

-- CreateIndex
CREATE INDEX "whatsapp_sessions_org_id_status_idx" ON "whatsapp_sessions"("org_id", "status");

-- CreateIndex
CREATE INDEX "whatsapp_sessions_last_heartbeat_at_idx" ON "whatsapp_sessions"("last_heartbeat_at");

-- CreateIndex
CREATE INDEX "whatsapp_sessions_deleted_at_idx" ON "whatsapp_sessions"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_sessions_user_id_deleted_at_key" ON "whatsapp_sessions"("user_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "messages_whatsapp_message_id_key" ON "messages"("whatsapp_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "messages_idempotency_key_key" ON "messages"("idempotency_key");

-- CreateIndex
CREATE INDEX "messages_org_id_idx" ON "messages"("org_id");

-- CreateIndex
CREATE INDEX "messages_session_id_idx" ON "messages"("session_id");

-- CreateIndex
CREATE INDEX "messages_contact_phone_idx" ON "messages"("contact_phone");

-- CreateIndex
CREATE INDEX "messages_org_id_contact_phone_idx" ON "messages"("org_id", "contact_phone");

-- CreateIndex
CREATE INDEX "messages_status_idx" ON "messages"("status");

-- CreateIndex
CREATE INDEX "messages_direction_idx" ON "messages"("direction");

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");

-- CreateIndex
CREATE INDEX "messages_org_id_created_at_idx" ON "messages"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_deleted_at_idx" ON "messages"("deleted_at");

-- CreateIndex
CREATE INDEX "whatsapp_auth_keys_session_id_idx" ON "whatsapp_auth_keys"("session_id");

-- CreateIndex
CREATE INDEX "whatsapp_auth_keys_session_id_key_type_idx" ON "whatsapp_auth_keys"("session_id", "key_type");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_auth_keys_session_id_key_type_key_id_key" ON "whatsapp_auth_keys"("session_id", "key_type", "key_id");

-- AddForeignKey
ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "whatsapp_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_auth_keys" ADD CONSTRAINT "whatsapp_auth_keys_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "whatsapp_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
