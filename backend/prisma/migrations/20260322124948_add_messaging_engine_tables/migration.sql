-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'MESSAGE_QUEUED';
ALTER TYPE "AuditAction" ADD VALUE 'MESSAGE_PROCESSING';
ALTER TYPE "AuditAction" ADD VALUE 'MESSAGE_DELIVERED';
ALTER TYPE "AuditAction" ADD VALUE 'MESSAGE_READ';
ALTER TYPE "AuditAction" ADD VALUE 'MESSAGE_RETRY';
ALTER TYPE "AuditAction" ADD VALUE 'MESSAGE_DEAD_LETTERED';
ALTER TYPE "AuditAction" ADD VALUE 'INCOMING_MESSAGE_RECEIVED';
ALTER TYPE "AuditAction" ADD VALUE 'INCOMING_MESSAGE_DUPLICATE_IGNORED';
ALTER TYPE "AuditAction" ADD VALUE 'RATE_LIMIT_EXCEEDED';

-- AlterEnum
ALTER TYPE "MessageStatus" ADD VALUE 'PROCESSING';

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "conversation_id" UUID,
ADD COLUMN     "max_retries" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "next_retry_at" TIMESTAMP(3),
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "processing_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "contact_id" UUID,
    "contact_phone" VARCHAR(20) NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "last_message_at" TIMESTAMP(3),
    "last_message_body" VARCHAR(500),
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "assigned_to_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_events" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "status" "MessageStatus" NOT NULL,
    "error" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dead_letter_messages" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "original_message_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "contact_phone" VARCHAR(20) NOT NULL,
    "type" "MessageType" NOT NULL,
    "body" TEXT,
    "media_url" VARCHAR(2048),
    "failed_reason" TEXT NOT NULL,
    "retry_count" INTEGER NOT NULL,
    "last_job_id" VARCHAR(255),
    "metadata" JSONB,
    "reprocessed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dead_letter_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversations_org_id_idx" ON "conversations"("org_id");

-- CreateIndex
CREATE INDEX "conversations_session_id_idx" ON "conversations"("session_id");

-- CreateIndex
CREATE INDEX "conversations_contact_phone_idx" ON "conversations"("contact_phone");

-- CreateIndex
CREATE INDEX "conversations_org_id_status_idx" ON "conversations"("org_id", "status");

-- CreateIndex
CREATE INDEX "conversations_last_message_at_idx" ON "conversations"("last_message_at");

-- CreateIndex
CREATE INDEX "conversations_org_id_last_message_at_idx" ON "conversations"("org_id", "last_message_at");

-- CreateIndex
CREATE INDEX "conversations_assigned_to_id_idx" ON "conversations"("assigned_to_id");

-- CreateIndex
CREATE INDEX "conversations_deleted_at_idx" ON "conversations"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_org_id_session_id_contact_phone_key" ON "conversations"("org_id", "session_id", "contact_phone");

-- CreateIndex
CREATE INDEX "message_events_message_id_idx" ON "message_events"("message_id");

-- CreateIndex
CREATE INDEX "message_events_message_id_created_at_idx" ON "message_events"("message_id", "created_at");

-- CreateIndex
CREATE INDEX "message_events_org_id_idx" ON "message_events"("org_id");

-- CreateIndex
CREATE INDEX "dead_letter_messages_org_id_idx" ON "dead_letter_messages"("org_id");

-- CreateIndex
CREATE INDEX "dead_letter_messages_original_message_id_idx" ON "dead_letter_messages"("original_message_id");

-- CreateIndex
CREATE INDEX "dead_letter_messages_session_id_idx" ON "dead_letter_messages"("session_id");

-- CreateIndex
CREATE INDEX "dead_letter_messages_created_at_idx" ON "dead_letter_messages"("created_at");

-- CreateIndex
CREATE INDEX "dead_letter_messages_reprocessed_at_idx" ON "dead_letter_messages"("reprocessed_at");

-- CreateIndex
CREATE INDEX "dead_letter_messages_org_id_reprocessed_at_idx" ON "dead_letter_messages"("org_id", "reprocessed_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");

-- CreateIndex
CREATE INDEX "messages_session_id_contact_phone_created_at_idx" ON "messages"("session_id", "contact_phone", "created_at");

-- CreateIndex
CREATE INDEX "messages_status_next_retry_at_idx" ON "messages"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "messages_org_id_status_direction_idx" ON "messages"("org_id", "status", "direction");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_events" ADD CONSTRAINT "message_events_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dead_letter_messages" ADD CONSTRAINT "dead_letter_messages_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
