-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CampaignAudienceType" AS ENUM ('ALL', 'FILTERED');

-- CreateEnum
CREATE TYPE "CampaignRecipientStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ScheduledMessageStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "AutomationTriggerType" AS ENUM ('MESSAGE_RECEIVED', 'CONTACT_CREATED', 'LEAD_STATUS_CHANGED', 'TIME_BASED', 'NO_REPLY');

-- CreateEnum
CREATE TYPE "AutomationConditionOperator" AS ENUM ('EQUALS', 'NOT_EQUALS', 'CONTAINS', 'IN', 'NOT_IN');

-- CreateEnum
CREATE TYPE "AutomationActionType" AS ENUM ('SEND_MESSAGE', 'ASSIGN_CONTACT', 'ADD_TAG', 'UPDATE_STATUS');

-- CreateEnum
CREATE TYPE "AutomationRuleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AutomationExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CAMPAIGN_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CAMPAIGN_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'CAMPAIGN_SCHEDULED';
ALTER TYPE "AuditAction" ADD VALUE 'CAMPAIGN_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'CAMPAIGN_PAUSED';
ALTER TYPE "AuditAction" ADD VALUE 'CAMPAIGN_RESUMED';
ALTER TYPE "AuditAction" ADD VALUE 'CAMPAIGN_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'CAMPAIGN_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'CAMPAIGN_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'SCHEDULED_MESSAGE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SCHEDULED_MESSAGE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'SCHEDULED_MESSAGE_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'SCHEDULED_MESSAGE_EXECUTED';
ALTER TYPE "AuditAction" ADD VALUE 'SCHEDULED_MESSAGE_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'AUTOMATION_RULE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'AUTOMATION_RULE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'AUTOMATION_RULE_ENABLED';
ALTER TYPE "AuditAction" ADD VALUE 'AUTOMATION_RULE_DISABLED';
ALTER TYPE "AuditAction" ADD VALUE 'AUTOMATION_RULE_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'AUTOMATION_EXECUTED';
ALTER TYPE "AuditAction" ADD VALUE 'AUTOMATION_FAILED';

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "opted_out" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "opted_out_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "message_type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "message_body" TEXT,
    "media_url" VARCHAR(2048),
    "media_mime_type" VARCHAR(100),
    "audience_type" "CampaignAudienceType" NOT NULL DEFAULT 'ALL',
    "audience_filters" JSONB,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMP(3),
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'UTC',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "delivered_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "read_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(255),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_recipients" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "contact_phone" VARCHAR(20) NOT NULL,
    "message_id" UUID,
    "status" "CampaignRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "failed_reason" TEXT,
    "processed_at" TIMESTAMP(3),
    "batch_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_events" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "previous_status" "CampaignStatus",
    "new_status" "CampaignStatus" NOT NULL,
    "triggered_by_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_messages" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "contact_phone" VARCHAR(20) NOT NULL,
    "message_type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "message_body" TEXT,
    "media_url" VARCHAR(2048),
    "media_mime_type" VARCHAR(100),
    "status" "ScheduledMessageStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'UTC',
    "sent_message_id" UUID,
    "failed_reason" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "pg_boss_job_id" VARCHAR(255),
    "idempotency_key" VARCHAR(255),
    "created_by_id" UUID NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "scheduled_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "trigger_type" "AutomationTriggerType" NOT NULL,
    "trigger_config" JSONB NOT NULL,
    "conditions" JSONB,
    "status" "AutomationRuleStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "max_executions_per_contact" INTEGER NOT NULL DEFAULT 0,
    "cooldown_seconds" INTEGER NOT NULL DEFAULT 0,
    "loop_prevention_key" VARCHAR(255),
    "created_by_id" UUID NOT NULL,
    "metadata" JSONB,
    "last_triggered_at" TIMESTAMP(3),
    "execution_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_actions" (
    "id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "action_type" "AutomationActionType" NOT NULL,
    "action_config" JSONB NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "delay_seconds" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_execution_logs" (
    "id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "contact_id" UUID,
    "trigger_event_type" VARCHAR(100) NOT NULL,
    "trigger_payload" JSONB NOT NULL,
    "status" "AutomationExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "action_results" JSONB,
    "error" TEXT,
    "idempotency_key" VARCHAR(255),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "execution_time_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_idempotency_key_key" ON "campaigns"("idempotency_key");

-- CreateIndex
CREATE INDEX "campaigns_org_id_idx" ON "campaigns"("org_id");

-- CreateIndex
CREATE INDEX "campaigns_org_id_status_idx" ON "campaigns"("org_id", "status");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaigns_scheduled_at_idx" ON "campaigns"("scheduled_at");

-- CreateIndex
CREATE INDEX "campaigns_org_id_created_at_idx" ON "campaigns"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "campaigns_created_by_id_idx" ON "campaigns"("created_by_id");

-- CreateIndex
CREATE INDEX "campaigns_deleted_at_idx" ON "campaigns"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_recipients_message_id_key" ON "campaign_recipients"("message_id");

-- CreateIndex
CREATE INDEX "campaign_recipients_campaign_id_idx" ON "campaign_recipients"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_recipients_campaign_id_status_idx" ON "campaign_recipients"("campaign_id", "status");

-- CreateIndex
CREATE INDEX "campaign_recipients_campaign_id_batch_number_idx" ON "campaign_recipients"("campaign_id", "batch_number");

-- CreateIndex
CREATE INDEX "campaign_recipients_message_id_idx" ON "campaign_recipients"("message_id");

-- CreateIndex
CREATE INDEX "campaign_recipients_org_id_idx" ON "campaign_recipients"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_recipients_campaign_id_contact_id_key" ON "campaign_recipients"("campaign_id", "contact_id");

-- CreateIndex
CREATE INDEX "campaign_events_campaign_id_idx" ON "campaign_events"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_events_campaign_id_created_at_idx" ON "campaign_events"("campaign_id", "created_at");

-- CreateIndex
CREATE INDEX "campaign_events_org_id_idx" ON "campaign_events"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_messages_sent_message_id_key" ON "scheduled_messages"("sent_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_messages_idempotency_key_key" ON "scheduled_messages"("idempotency_key");

-- CreateIndex
CREATE INDEX "scheduled_messages_org_id_idx" ON "scheduled_messages"("org_id");

-- CreateIndex
CREATE INDEX "scheduled_messages_org_id_status_idx" ON "scheduled_messages"("org_id", "status");

-- CreateIndex
CREATE INDEX "scheduled_messages_status_scheduled_at_idx" ON "scheduled_messages"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "scheduled_messages_session_id_idx" ON "scheduled_messages"("session_id");

-- CreateIndex
CREATE INDEX "scheduled_messages_created_by_id_idx" ON "scheduled_messages"("created_by_id");

-- CreateIndex
CREATE INDEX "scheduled_messages_scheduled_at_idx" ON "scheduled_messages"("scheduled_at");

-- CreateIndex
CREATE INDEX "scheduled_messages_deleted_at_idx" ON "scheduled_messages"("deleted_at");

-- CreateIndex
CREATE INDEX "automation_rules_org_id_idx" ON "automation_rules"("org_id");

-- CreateIndex
CREATE INDEX "automation_rules_org_id_status_idx" ON "automation_rules"("org_id", "status");

-- CreateIndex
CREATE INDEX "automation_rules_org_id_trigger_type_status_idx" ON "automation_rules"("org_id", "trigger_type", "status");

-- CreateIndex
CREATE INDEX "automation_rules_status_idx" ON "automation_rules"("status");

-- CreateIndex
CREATE INDEX "automation_rules_trigger_type_idx" ON "automation_rules"("trigger_type");

-- CreateIndex
CREATE INDEX "automation_rules_created_by_id_idx" ON "automation_rules"("created_by_id");

-- CreateIndex
CREATE INDEX "automation_rules_deleted_at_idx" ON "automation_rules"("deleted_at");

-- CreateIndex
CREATE INDEX "automation_actions_rule_id_idx" ON "automation_actions"("rule_id");

-- CreateIndex
CREATE INDEX "automation_actions_rule_id_order_index_idx" ON "automation_actions"("rule_id", "order_index");

-- CreateIndex
CREATE INDEX "automation_actions_org_id_idx" ON "automation_actions"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "automation_execution_logs_idempotency_key_key" ON "automation_execution_logs"("idempotency_key");

-- CreateIndex
CREATE INDEX "automation_execution_logs_rule_id_idx" ON "automation_execution_logs"("rule_id");

-- CreateIndex
CREATE INDEX "automation_execution_logs_rule_id_status_idx" ON "automation_execution_logs"("rule_id", "status");

-- CreateIndex
CREATE INDEX "automation_execution_logs_org_id_idx" ON "automation_execution_logs"("org_id");

-- CreateIndex
CREATE INDEX "automation_execution_logs_org_id_status_idx" ON "automation_execution_logs"("org_id", "status");

-- CreateIndex
CREATE INDEX "automation_execution_logs_org_id_created_at_idx" ON "automation_execution_logs"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "automation_execution_logs_contact_id_idx" ON "automation_execution_logs"("contact_id");

-- CreateIndex
CREATE INDEX "automation_execution_logs_rule_id_contact_id_idx" ON "automation_execution_logs"("rule_id", "contact_id");

-- CreateIndex
CREATE INDEX "automation_execution_logs_status_idx" ON "automation_execution_logs"("status");

-- CreateIndex
CREATE INDEX "automation_execution_logs_created_at_idx" ON "automation_execution_logs"("created_at");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "whatsapp_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_events" ADD CONSTRAINT "campaign_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_actions" ADD CONSTRAINT "automation_actions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_execution_logs" ADD CONSTRAINT "automation_execution_logs_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "automation_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
