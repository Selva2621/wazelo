/*
  Warnings:

  - A unique constraint covering the columns `[org_id,channel_id,contact_identifier]` on the table `conversations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[external_message_id]` on the table `messages` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('WHATSAPP', 'INSTAGRAM', 'FACEBOOK_MESSENGER', 'EMAIL');

-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('PENDING_SETUP', 'VERIFYING', 'ACTIVE', 'SUSPENDED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "SequenceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SequenceRecipientStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXITED', 'PAUSED');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('CRM', 'DEVELOPER');

-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('CRM', 'DEVELOPER');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('BILLING', 'TECHNICAL', 'GENERAL', 'FEATURE_REQUEST');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SlaMetricType" AS ENUM ('FIRST_RESPONSE_TIME', 'AVG_RESPONSE_TIME', 'RESOLUTION_TIME');

-- CreateEnum
CREATE TYPE "SlaPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SlaBreachStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ChatbotSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED', 'HANDED_OFF');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('OPEN', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CONVERSATION_CLOSED';
ALTER TYPE "AuditAction" ADD VALUE 'CONVERSATION_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE 'CSAT_SURVEY_SENT';
ALTER TYPE "AuditAction" ADD VALUE 'LEAD_AD_RECEIVED';
ALTER TYPE "AuditAction" ADD VALUE 'LEAD_AD_PROCESSED';
ALTER TYPE "AuditAction" ADD VALUE 'LEAD_AD_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'LEAD_AD_CONFIG_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'LEAD_AD_CONFIG_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'CHANNEL_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CHANNEL_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'CHANNEL_VERIFIED';
ALTER TYPE "AuditAction" ADD VALUE 'CHANNEL_SUSPENDED';
ALTER TYPE "AuditAction" ADD VALUE 'CHANNEL_REACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'CHANNEL_DISCONNECTED';
ALTER TYPE "AuditAction" ADD VALUE 'CHANNEL_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'CHANNEL_ERROR';
ALTER TYPE "AuditAction" ADD VALUE 'SLA_POLICY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SLA_POLICY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'SLA_POLICY_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'SLA_POLICY_ENABLED';
ALTER TYPE "AuditAction" ADD VALUE 'SLA_POLICY_DISABLED';
ALTER TYPE "AuditAction" ADD VALUE 'SLA_BREACH_DETECTED';
ALTER TYPE "AuditAction" ADD VALUE 'SLA_BREACH_ACKNOWLEDGED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AutomationTriggerType" ADD VALUE 'LEAD_AD_RECEIVED';
ALTER TYPE "AutomationTriggerType" ADD VALUE 'SHOPIFY_ORDER_CREATED';
ALTER TYPE "AutomationTriggerType" ADD VALUE 'SHOPIFY_ORDER_FULFILLED';
ALTER TYPE "AutomationTriggerType" ADD VALUE 'SHOPIFY_CART_ABANDONED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContactSource" ADD VALUE 'INSTAGRAM';
ALTER TYPE "ContactSource" ADD VALUE 'FACEBOOK';
ALTER TYPE "ContactSource" ADD VALUE 'EMAIL';
ALTER TYPE "ContactSource" ADD VALUE 'FACEBOOK_LEAD_AD';
ALTER TYPE "ContactSource" ADD VALUE 'INSTAGRAM_LEAD_AD';
ALTER TYPE "ContactSource" ADD VALUE 'WHATSAPP_LEAD_AD';
ALTER TYPE "ContactSource" ADD VALUE 'SHOPIFY';

-- AlterEnum
ALTER TYPE "IntegrationProvider" ADD VALUE 'SHOPIFY';

-- AlterEnum
ALTER TYPE "MessageType" ADD VALUE 'INTERACTIVE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SLA_BREACH';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_REPLY';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_RESOLVED';

-- AlterEnum
ALTER TYPE "UsageMetricType" ADD VALUE 'API_CALLS';

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_session_id_fkey";

-- DropForeignKey
ALTER TABLE "org_ai_memories" DROP CONSTRAINT "org_ai_memories_org_id_fkey";

-- AlterTable
ALTER TABLE "alert_events" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "alert_rules" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "automation_rules" ADD COLUMN     "product_id" UUID;

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "product_id" UUID;

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "lead_score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "score_updated_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "channel_id" UUID,
ADD COLUMN     "channel_type" "ChannelType",
ADD COLUMN     "contact_identifier" VARCHAR(255),
ALTER COLUMN "session_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "dead_letter_messages" ADD COLUMN     "channel_id" UUID,
ADD COLUMN     "queue_name" VARCHAR(100),
ALTER COLUMN "session_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "channel_id" UUID,
ADD COLUMN     "channel_payload" JSONB,
ADD COLUMN     "channel_type" "ChannelType",
ADD COLUMN     "external_message_id" VARCHAR(255),
ADD COLUMN     "interactive_payload" JSONB,
ALTER COLUMN "session_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "org_ai_memories" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "built_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "org_type" "OrgType" NOT NULL DEFAULT 'CRM',
ADD COLUMN     "trial_used_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "api_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plan_type" "PlanType" NOT NULL DEFAULT 'CRM',
ADD COLUMN     "trial_max_campaigns_per_month" INTEGER,
ADD COLUMN     "trial_max_messages_per_month" INTEGER,
ADD COLUMN     "trial_max_users" INTEGER,
ADD COLUMN     "trial_max_whatsapp_sessions" INTEGER;

-- AlterTable
ALTER TABLE "scheduled_messages" ADD COLUMN     "product_id" UUID;

-- AlterTable
ALTER TABLE "system_metric_snapshots" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_online" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_seen_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "widget_messages" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "widget_sessions" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "channels" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "type" "ChannelType" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" "ChannelStatus" NOT NULL DEFAULT 'PENDING_SETUP',
    "external_id" VARCHAR(255),
    "external_handle" VARCHAR(255),
    "encrypted_config" TEXT,
    "capabilities" JSONB NOT NULL DEFAULT '[]',
    "rate_limit_per_min" INTEGER NOT NULL DEFAULT 60,
    "rate_limit_burst" INTEGER NOT NULL DEFAULT 120,
    "webhook_id" VARCHAR(255),
    "webhook_secret" VARCHAR(255),
    "legacy_session_id" UUID,
    "created_by_id" UUID NOT NULL,
    "verified_at" TIMESTAMP(3),
    "suspended_at" TIMESTAMP(3),
    "suspend_reason" VARCHAR(500),
    "last_active_at" TIMESTAMP(3),
    "last_error_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_rate_limits" (
    "id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_labels" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_sequences" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "SequenceStatus" NOT NULL DEFAULT 'DRAFT',
    "audience_type" "CampaignAudienceType" NOT NULL DEFAULT 'FILTERED',
    "audience_filters" JSONB,
    "exit_on_reply" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "completed_count" INTEGER NOT NULL DEFAULT 0,
    "exited_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "campaign_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_sequence_steps" (
    "id" UUID NOT NULL,
    "sequence_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "step_order" INTEGER NOT NULL,
    "name" VARCHAR(255),
    "message_type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "message_body" TEXT,
    "media_url" VARCHAR(2048),
    "media_mime_type" VARCHAR(100),
    "delay_minutes" INTEGER NOT NULL DEFAULT 1440,
    "conditions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_sequence_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_recipients" (
    "id" UUID NOT NULL,
    "sequence_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "contact_phone" VARCHAR(20) NOT NULL,
    "status" "SequenceRecipientStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "next_step_at" TIMESTAMP(3),
    "exit_reason" VARCHAR(255),
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sequence_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_recipient_steps" (
    "id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "step_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "message_id" UUID,
    "status" "CampaignRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),
    "failed_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sequence_recipient_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_templates" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100),
    "message_type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "message_body" TEXT,
    "media_url" VARCHAR(2048),
    "media_mime_type" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "sequence_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "manager_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canned_responses" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "content" TEXT NOT NULL,
    "shortcut" VARCHAR(50),
    "category" VARCHAR(100),
    "created_by_id" UUID NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "canned_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "channel_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "category" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "whatsapp_template_id" VARCHAR(255),
    "components" JSONB NOT NULL DEFAULT '[]',
    "example_values" JSONB,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_ad_entries" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "leadgen_id" VARCHAR(255) NOT NULL,
    "page_id" VARCHAR(255) NOT NULL,
    "form_id" VARCHAR(255),
    "ad_id" VARCHAR(255),
    "ad_name" VARCHAR(500),
    "campaign_id" VARCHAR(255),
    "campaign_name" VARCHAR(500),
    "platform" VARCHAR(50) NOT NULL,
    "lead_data" JSONB NOT NULL,
    "contact_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "processed_at" TIMESTAMP(3),
    "raw_webhook_data" JSONB,
    "channel_id" UUID,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_ad_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_ads_configs" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "encrypted_app_secret" TEXT,
    "webhook_verify_token" VARCHAR(255),
    "is_configured" BOOLEAN NOT NULL DEFAULT false,
    "last_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_ads_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_message_daily" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID,
    "date" DATE NOT NULL,
    "inbound_count" INTEGER NOT NULL DEFAULT 0,
    "outbound_count" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "delivered_count" INTEGER NOT NULL DEFAULT 0,
    "read_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_message_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_message_hourly" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "hour" TIMESTAMPTZ NOT NULL,
    "inbound_count" INTEGER NOT NULL DEFAULT 0,
    "outbound_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_message_hourly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_response_time" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID,
    "date" DATE NOT NULL,
    "total_response_time_ms" BIGINT NOT NULL DEFAULT 0,
    "response_count" INTEGER NOT NULL DEFAULT 0,
    "min_response_time_ms" INTEGER,
    "max_response_time_ms" INTEGER,
    "p50_response_time_ms" INTEGER,
    "p95_response_time_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_response_time_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_conversion_daily" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "new_count" INTEGER NOT NULL DEFAULT 0,
    "contacted_count" INTEGER NOT NULL DEFAULT 0,
    "interested_count" INTEGER NOT NULL DEFAULT 0,
    "converted_count" INTEGER NOT NULL DEFAULT 0,
    "closed_count" INTEGER NOT NULL DEFAULT 0,
    "transitions_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_conversion_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_campaign_summary" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "total_campaigns" INTEGER NOT NULL DEFAULT 0,
    "completed_campaigns" INTEGER NOT NULL DEFAULT 0,
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "total_sent" INTEGER NOT NULL DEFAULT 0,
    "total_delivered" INTEGER NOT NULL DEFAULT 0,
    "total_failed" INTEGER NOT NULL DEFAULT 0,
    "total_read" INTEGER NOT NULL DEFAULT 0,
    "avg_delivery_rate_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_campaign_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_policies" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(1000),
    "metric_type" "SlaMetricType" NOT NULL,
    "priority" "SlaPriority" NOT NULL DEFAULT 'NORMAL',
    "threshold_ms" INTEGER NOT NULL,
    "warning_threshold_ms" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "business_hours_only" BOOLEAN NOT NULL DEFAULT false,
    "business_hours_start" INTEGER,
    "business_hours_end" INTEGER,
    "business_days" JSONB,
    "timezone" VARCHAR(50),
    "notify_on_warning" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_breach" BOOLEAN NOT NULL DEFAULT true,
    "notify_user_ids" JSONB,
    "escalation_policy" JSONB,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_trackings" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "assigned_user_id" UUID,
    "started_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "deadline_at" TIMESTAMP(3) NOT NULL,
    "warning_at" TIMESTAMP(3),
    "elapsed_ms" INTEGER,
    "is_breached" BOOLEAN NOT NULL DEFAULT false,
    "is_warning" BOOLEAN NOT NULL DEFAULT false,
    "paused_at" TIMESTAMP(3),
    "paused_duration_ms" INTEGER NOT NULL DEFAULT 0,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_trackings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_breach_logs" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "assigned_user_id" UUID,
    "metric_type" "SlaMetricType" NOT NULL,
    "threshold_ms" INTEGER NOT NULL,
    "actual_ms" INTEGER NOT NULL,
    "status" "SlaBreachStatus" NOT NULL DEFAULT 'ACTIVE',
    "acknowledged_by" UUID,
    "acknowledged_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "idempotency_key" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_breach_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "csat_surveys" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "contact_phone" VARCHAR(20) NOT NULL,
    "agent_id" UUID NOT NULL,
    "rating" INTEGER,
    "comment" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "channel_type" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "product_id" UUID,

    CONSTRAINT "csat_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_flows" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "trigger" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "ai_enabled" BOOLEAN NOT NULL DEFAULT false,
    "ai_system_prompt" TEXT,
    "use_knowledge_base" BOOLEAN NOT NULL DEFAULT false,
    "product_ids" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "chatbot_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_nodes" (
    "id" UUID NOT NULL,
    "flow_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "data" JSONB NOT NULL,
    "position" JSONB NOT NULL,
    "nextNodes" JSONB NOT NULL,

    CONSTRAINT "chatbot_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_sessions" (
    "id" UUID NOT NULL,
    "flow_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "current_node_id" UUID,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "status" "ChatbotSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "chatbot_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversation_summaries" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "key_topics" TEXT[],
    "sentiment" VARCHAR(20),
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_conversation_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_scoring_rules" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "signal" VARCHAR(100) NOT NULL,
    "condition" JSONB,
    "points" INTEGER NOT NULL,
    "max_per_contact" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_scoring_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_score_history" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "previous_score" INTEGER NOT NULL,
    "new_score" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "rule_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_score_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipelines" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_stages" (
    "id" UUID NOT NULL,
    "pipeline_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL,
    "color" VARCHAR(20),
    "is_won_stage" BOOLEAN NOT NULL DEFAULT false,
    "is_lost_stage" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "pipeline_id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "assigned_to_id" UUID,
    "title" VARCHAR(500) NOT NULL,
    "value" DECIMAL(15,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "DealStatus" NOT NULL DEFAULT 'OPEN',
    "expected_close" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "notes" TEXT,
    "ai_score" INTEGER,
    "ai_score_reason" VARCHAR(500),
    "ai_scored_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "product_id" UUID,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "color" VARCHAR(7),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "parent_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2),
    "currency" VARCHAR(10) DEFAULT 'INR',
    "sku" VARCHAR(100),
    "image_url" VARCHAR(2048),
    "category_id" UUID,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_products" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_two_factors" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "encrypted_secret" TEXT NOT NULL,
    "backup_codes" TEXT[],
    "enabled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_two_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "widget_configs" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "position" VARCHAR(20) NOT NULL DEFAULT 'bottom-right',
    "primary_color" VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    "welcome_message" VARCHAR(500) NOT NULL DEFAULT 'Hi! How can we help you?',
    "placeholder" VARCHAR(255) NOT NULL DEFAULT 'Type a message...',
    "company_name" VARCHAR(255),
    "avatar_url" VARCHAR(2048),
    "whatsapp_number" VARCHAR(20),
    "pre_chat_form_enabled" BOOLEAN NOT NULL DEFAULT false,
    "ai_assistant_enabled" BOOLEAN NOT NULL DEFAULT false,
    "ai_system_prompt" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "widget_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "consent_type" VARCHAR(100) NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "ip_address" VARCHAR(45),
    "metadata" JSONB,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_requests" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "request_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "requested_by_id" UUID NOT NULL,
    "completed_at" TIMESTAMP(3),
    "result_url" VARCHAR(2048),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_categories" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kb_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_articles" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "category_id" UUID,
    "title" VARCHAR(500) NOT NULL,
    "slug" VARCHAR(500) NOT NULL,
    "body" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "author_id" UUID NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "kb_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_products" (
    "id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_documents" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "flow_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "file_url" TEXT NOT NULL,
    "content_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "extracted_text" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PROCESSING',
    "uploaded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "kb_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_definitions" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "entity" VARCHAR(50) NOT NULL,
    "field_name" VARCHAR(100) NOT NULL,
    "field_label" VARCHAR(255) NOT NULL,
    "field_type" VARCHAR(30) NOT NULL,
    "options" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "default_value" VARCHAR(1000),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_values" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "field_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "key_prefix" VARCHAR(12) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY['read']::TEXT[],
    "expires_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "last_used_ip" VARCHAR(45),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "super_admins" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_tickets" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "attachment_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "help_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_replies" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "user_id" UUID,
    "super_admin_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "channels_legacy_session_id_key" ON "channels"("legacy_session_id");

-- CreateIndex
CREATE INDEX "channels_org_id_idx" ON "channels"("org_id");

-- CreateIndex
CREATE INDEX "channels_org_id_type_idx" ON "channels"("org_id", "type");

-- CreateIndex
CREATE INDEX "channels_type_status_idx" ON "channels"("type", "status");

-- CreateIndex
CREATE INDEX "channels_status_idx" ON "channels"("status");

-- CreateIndex
CREATE INDEX "channels_external_id_idx" ON "channels"("external_id");

-- CreateIndex
CREATE INDEX "channels_external_handle_idx" ON "channels"("external_handle");

-- CreateIndex
CREATE INDEX "channels_last_active_at_idx" ON "channels"("last_active_at");

-- CreateIndex
CREATE INDEX "channels_deleted_at_idx" ON "channels"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "channels_org_id_type_external_handle_deleted_at_key" ON "channels"("org_id", "type", "external_handle", "deleted_at");

-- CreateIndex
CREATE INDEX "channel_rate_limits_channel_id_window_start_idx" ON "channel_rate_limits"("channel_id", "window_start");

-- CreateIndex
CREATE INDEX "channel_rate_limits_org_id_idx" ON "channel_rate_limits"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_rate_limits_channel_id_window_start_key" ON "channel_rate_limits"("channel_id", "window_start");

-- CreateIndex
CREATE INDEX "conversation_labels_org_id_idx" ON "conversation_labels"("org_id");

-- CreateIndex
CREATE INDEX "conversation_labels_conversation_id_idx" ON "conversation_labels"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_labels_conversation_id_name_key" ON "conversation_labels"("conversation_id", "name");

-- CreateIndex
CREATE INDEX "campaign_sequences_org_id_idx" ON "campaign_sequences"("org_id");

-- CreateIndex
CREATE INDEX "campaign_sequences_org_id_status_idx" ON "campaign_sequences"("org_id", "status");

-- CreateIndex
CREATE INDEX "campaign_sequences_deleted_at_idx" ON "campaign_sequences"("deleted_at");

-- CreateIndex
CREATE INDEX "campaign_sequence_steps_sequence_id_idx" ON "campaign_sequence_steps"("sequence_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_sequence_steps_sequence_id_step_order_key" ON "campaign_sequence_steps"("sequence_id", "step_order");

-- CreateIndex
CREATE INDEX "sequence_recipients_sequence_id_status_idx" ON "sequence_recipients"("sequence_id", "status");

-- CreateIndex
CREATE INDEX "sequence_recipients_status_next_step_at_idx" ON "sequence_recipients"("status", "next_step_at");

-- CreateIndex
CREATE INDEX "sequence_recipients_org_id_idx" ON "sequence_recipients"("org_id");

-- CreateIndex
CREATE INDEX "sequence_recipients_contact_id_idx" ON "sequence_recipients"("contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "sequence_recipients_sequence_id_contact_id_key" ON "sequence_recipients"("sequence_id", "contact_id");

-- CreateIndex
CREATE INDEX "sequence_recipient_steps_status_scheduled_at_idx" ON "sequence_recipient_steps"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "sequence_recipient_steps_org_id_idx" ON "sequence_recipient_steps"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "sequence_recipient_steps_recipient_id_step_id_key" ON "sequence_recipient_steps"("recipient_id", "step_id");

-- CreateIndex
CREATE INDEX "sequence_templates_org_id_idx" ON "sequence_templates"("org_id");

-- CreateIndex
CREATE INDEX "sequence_templates_org_id_category_idx" ON "sequence_templates"("org_id", "category");

-- CreateIndex
CREATE INDEX "teams_org_id_idx" ON "teams"("org_id");

-- CreateIndex
CREATE INDEX "teams_manager_id_idx" ON "teams"("manager_id");

-- CreateIndex
CREATE INDEX "teams_deleted_at_idx" ON "teams"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "teams_org_id_name_deleted_at_key" ON "teams"("org_id", "name", "deleted_at");

-- CreateIndex
CREATE INDEX "team_members_team_id_idx" ON "team_members"("team_id");

-- CreateIndex
CREATE INDEX "team_members_user_id_idx" ON "team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");

-- CreateIndex
CREATE INDEX "canned_responses_org_id_idx" ON "canned_responses"("org_id");

-- CreateIndex
CREATE INDEX "canned_responses_org_id_category_idx" ON "canned_responses"("org_id", "category");

-- CreateIndex
CREATE INDEX "canned_responses_deleted_at_idx" ON "canned_responses"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "canned_responses_org_id_shortcut_deleted_at_key" ON "canned_responses"("org_id", "shortcut", "deleted_at");

-- CreateIndex
CREATE INDEX "message_templates_org_id_idx" ON "message_templates"("org_id");

-- CreateIndex
CREATE INDEX "message_templates_org_id_status_idx" ON "message_templates"("org_id", "status");

-- CreateIndex
CREATE INDEX "message_templates_channel_id_idx" ON "message_templates"("channel_id");

-- CreateIndex
CREATE INDEX "message_templates_deleted_at_idx" ON "message_templates"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_org_id_name_language_deleted_at_key" ON "message_templates"("org_id", "name", "language", "deleted_at");

-- CreateIndex
CREATE INDEX "lead_ad_entries_org_id_idx" ON "lead_ad_entries"("org_id");

-- CreateIndex
CREATE INDEX "lead_ad_entries_org_id_status_idx" ON "lead_ad_entries"("org_id", "status");

-- CreateIndex
CREATE INDEX "lead_ad_entries_page_id_idx" ON "lead_ad_entries"("page_id");

-- CreateIndex
CREATE INDEX "lead_ad_entries_org_id_platform_idx" ON "lead_ad_entries"("org_id", "platform");

-- CreateIndex
CREATE INDEX "lead_ad_entries_contact_id_idx" ON "lead_ad_entries"("contact_id");

-- CreateIndex
CREATE INDEX "lead_ad_entries_created_at_idx" ON "lead_ad_entries"("created_at");

-- CreateIndex
CREATE INDEX "lead_ad_entries_org_id_created_at_idx" ON "lead_ad_entries"("org_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "lead_ad_entries_org_id_leadgen_id_key" ON "lead_ad_entries"("org_id", "leadgen_id");

-- CreateIndex
CREATE UNIQUE INDEX "lead_ads_configs_org_id_key" ON "lead_ads_configs"("org_id");

-- CreateIndex
CREATE INDEX "analytics_message_daily_org_id_date_idx" ON "analytics_message_daily"("org_id", "date");

-- CreateIndex
CREATE INDEX "analytics_message_daily_org_id_user_id_date_idx" ON "analytics_message_daily"("org_id", "user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_message_daily_org_id_user_id_date_key" ON "analytics_message_daily"("org_id", "user_id", "date");

-- CreateIndex
CREATE INDEX "analytics_message_hourly_org_id_hour_idx" ON "analytics_message_hourly"("org_id", "hour");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_message_hourly_org_id_hour_key" ON "analytics_message_hourly"("org_id", "hour");

-- CreateIndex
CREATE INDEX "analytics_response_time_org_id_date_idx" ON "analytics_response_time"("org_id", "date");

-- CreateIndex
CREATE INDEX "analytics_response_time_org_id_user_id_date_idx" ON "analytics_response_time"("org_id", "user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_response_time_org_id_user_id_date_key" ON "analytics_response_time"("org_id", "user_id", "date");

-- CreateIndex
CREATE INDEX "analytics_conversion_daily_org_id_date_idx" ON "analytics_conversion_daily"("org_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_conversion_daily_org_id_date_key" ON "analytics_conversion_daily"("org_id", "date");

-- CreateIndex
CREATE INDEX "analytics_campaign_summary_org_id_date_idx" ON "analytics_campaign_summary"("org_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_campaign_summary_org_id_date_key" ON "analytics_campaign_summary"("org_id", "date");

-- CreateIndex
CREATE INDEX "sla_policies_org_id_idx" ON "sla_policies"("org_id");

-- CreateIndex
CREATE INDEX "sla_policies_org_id_is_active_idx" ON "sla_policies"("org_id", "is_active");

-- CreateIndex
CREATE INDEX "sla_policies_org_id_metric_type_idx" ON "sla_policies"("org_id", "metric_type");

-- CreateIndex
CREATE INDEX "sla_policies_deleted_at_idx" ON "sla_policies"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "sla_policies_org_id_name_deleted_at_key" ON "sla_policies"("org_id", "name", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "sla_trackings_idempotency_key_key" ON "sla_trackings"("idempotency_key");

-- CreateIndex
CREATE INDEX "sla_trackings_org_id_idx" ON "sla_trackings"("org_id");

-- CreateIndex
CREATE INDEX "sla_trackings_org_id_policy_id_idx" ON "sla_trackings"("org_id", "policy_id");

-- CreateIndex
CREATE INDEX "sla_trackings_org_id_is_breached_idx" ON "sla_trackings"("org_id", "is_breached");

-- CreateIndex
CREATE INDEX "sla_trackings_org_id_conversation_id_idx" ON "sla_trackings"("org_id", "conversation_id");

-- CreateIndex
CREATE INDEX "sla_trackings_deadline_at_idx" ON "sla_trackings"("deadline_at");

-- CreateIndex
CREATE INDEX "sla_trackings_assigned_user_id_idx" ON "sla_trackings"("assigned_user_id");

-- CreateIndex
CREATE INDEX "sla_trackings_org_id_assigned_user_id_is_breached_idx" ON "sla_trackings"("org_id", "assigned_user_id", "is_breached");

-- CreateIndex
CREATE UNIQUE INDEX "sla_breach_logs_idempotency_key_key" ON "sla_breach_logs"("idempotency_key");

-- CreateIndex
CREATE INDEX "sla_breach_logs_org_id_idx" ON "sla_breach_logs"("org_id");

-- CreateIndex
CREATE INDEX "sla_breach_logs_org_id_status_idx" ON "sla_breach_logs"("org_id", "status");

-- CreateIndex
CREATE INDEX "sla_breach_logs_org_id_policy_id_idx" ON "sla_breach_logs"("org_id", "policy_id");

-- CreateIndex
CREATE INDEX "sla_breach_logs_org_id_assigned_user_id_idx" ON "sla_breach_logs"("org_id", "assigned_user_id");

-- CreateIndex
CREATE INDEX "sla_breach_logs_conversation_id_idx" ON "sla_breach_logs"("conversation_id");

-- CreateIndex
CREATE INDEX "sla_breach_logs_created_at_idx" ON "sla_breach_logs"("created_at");

-- CreateIndex
CREATE INDEX "sla_breach_logs_org_id_created_at_idx" ON "sla_breach_logs"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "csat_surveys_org_id_idx" ON "csat_surveys"("org_id");

-- CreateIndex
CREATE INDEX "csat_surveys_org_id_agent_id_idx" ON "csat_surveys"("org_id", "agent_id");

-- CreateIndex
CREATE INDEX "csat_surveys_org_id_sent_at_idx" ON "csat_surveys"("org_id", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "csat_surveys_conversation_id_key" ON "csat_surveys"("conversation_id");

-- CreateIndex
CREATE INDEX "chatbot_flows_org_id_idx" ON "chatbot_flows"("org_id");

-- CreateIndex
CREATE INDEX "chatbot_flows_org_id_is_active_idx" ON "chatbot_flows"("org_id", "is_active");

-- CreateIndex
CREATE INDEX "chatbot_nodes_flow_id_idx" ON "chatbot_nodes"("flow_id");

-- CreateIndex
CREATE INDEX "chatbot_sessions_org_id_conversation_id_idx" ON "chatbot_sessions"("org_id", "conversation_id");

-- CreateIndex
CREATE INDEX "chatbot_sessions_org_id_status_idx" ON "chatbot_sessions"("org_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_conversation_summaries_conversation_id_key" ON "ai_conversation_summaries"("conversation_id");

-- CreateIndex
CREATE INDEX "ai_conversation_summaries_org_id_idx" ON "ai_conversation_summaries"("org_id");

-- CreateIndex
CREATE INDEX "lead_scoring_rules_org_id_idx" ON "lead_scoring_rules"("org_id");

-- CreateIndex
CREATE INDEX "lead_scoring_rules_org_id_signal_idx" ON "lead_scoring_rules"("org_id", "signal");

-- CreateIndex
CREATE INDEX "contact_score_history_contact_id_idx" ON "contact_score_history"("contact_id");

-- CreateIndex
CREATE INDEX "contact_score_history_org_id_idx" ON "contact_score_history"("org_id");

-- CreateIndex
CREATE INDEX "contact_score_history_contact_id_created_at_idx" ON "contact_score_history"("contact_id", "created_at");

-- CreateIndex
CREATE INDEX "pipelines_org_id_idx" ON "pipelines"("org_id");

-- CreateIndex
CREATE INDEX "pipeline_stages_pipeline_id_order_idx" ON "pipeline_stages"("pipeline_id", "order");

-- CreateIndex
CREATE INDEX "deals_org_id_idx" ON "deals"("org_id");

-- CreateIndex
CREATE INDEX "deals_org_id_pipeline_id_idx" ON "deals"("org_id", "pipeline_id");

-- CreateIndex
CREATE INDEX "deals_org_id_stage_id_idx" ON "deals"("org_id", "stage_id");

-- CreateIndex
CREATE INDEX "deals_org_id_assigned_to_id_idx" ON "deals"("org_id", "assigned_to_id");

-- CreateIndex
CREATE INDEX "deals_org_id_status_idx" ON "deals"("org_id", "status");

-- CreateIndex
CREATE INDEX "product_categories_org_id_idx" ON "product_categories"("org_id");

-- CreateIndex
CREATE INDEX "product_categories_parent_id_idx" ON "product_categories"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_org_id_name_key" ON "product_categories"("org_id", "name");

-- CreateIndex
CREATE INDEX "products_org_id_idx" ON "products"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_org_id_name_deleted_at_key" ON "products"("org_id", "name", "deleted_at");

-- CreateIndex
CREATE INDEX "contact_products_contact_id_idx" ON "contact_products"("contact_id");

-- CreateIndex
CREATE INDEX "contact_products_product_id_idx" ON "contact_products"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "contact_products_contact_id_product_id_key" ON "contact_products"("contact_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_two_factors_user_id_key" ON "user_two_factors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "widget_configs_org_id_key" ON "widget_configs"("org_id");

-- CreateIndex
CREATE INDEX "consent_records_contact_id_idx" ON "consent_records"("contact_id");

-- CreateIndex
CREATE INDEX "consent_records_org_id_idx" ON "consent_records"("org_id");

-- CreateIndex
CREATE INDEX "consent_records_org_id_consent_type_idx" ON "consent_records"("org_id", "consent_type");

-- CreateIndex
CREATE INDEX "consent_records_contact_id_consent_type_idx" ON "consent_records"("contact_id", "consent_type");

-- CreateIndex
CREATE INDEX "data_requests_org_id_idx" ON "data_requests"("org_id");

-- CreateIndex
CREATE INDEX "data_requests_contact_id_idx" ON "data_requests"("contact_id");

-- CreateIndex
CREATE INDEX "data_requests_org_id_status_idx" ON "data_requests"("org_id", "status");

-- CreateIndex
CREATE INDEX "kb_categories_org_id_idx" ON "kb_categories"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "kb_categories_org_id_slug_key" ON "kb_categories"("org_id", "slug");

-- CreateIndex
CREATE INDEX "kb_articles_org_id_idx" ON "kb_articles"("org_id");

-- CreateIndex
CREATE INDEX "kb_articles_org_id_is_published_idx" ON "kb_articles"("org_id", "is_published");

-- CreateIndex
CREATE INDEX "kb_articles_category_id_idx" ON "kb_articles"("category_id");

-- CreateIndex
CREATE INDEX "kb_articles_deleted_at_idx" ON "kb_articles"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "kb_articles_org_id_slug_key" ON "kb_articles"("org_id", "slug");

-- CreateIndex
CREATE INDEX "article_products_article_id_idx" ON "article_products"("article_id");

-- CreateIndex
CREATE INDEX "article_products_product_id_idx" ON "article_products"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "article_products_article_id_product_id_key" ON "article_products"("article_id", "product_id");

-- CreateIndex
CREATE INDEX "kb_documents_org_id_idx" ON "kb_documents"("org_id");

-- CreateIndex
CREATE INDEX "kb_documents_org_id_flow_id_idx" ON "kb_documents"("org_id", "flow_id");

-- CreateIndex
CREATE INDEX "kb_documents_org_id_status_idx" ON "kb_documents"("org_id", "status");

-- CreateIndex
CREATE INDEX "custom_field_definitions_org_id_entity_idx" ON "custom_field_definitions"("org_id", "entity");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_definitions_org_id_entity_field_name_key" ON "custom_field_definitions"("org_id", "entity", "field_name");

-- CreateIndex
CREATE INDEX "custom_field_values_org_id_entity_id_idx" ON "custom_field_values"("org_id", "entity_id");

-- CreateIndex
CREATE INDEX "custom_field_values_field_id_idx" ON "custom_field_values"("field_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_field_id_entity_id_key" ON "custom_field_values"("field_id", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_org_id_idx" ON "api_keys"("org_id");

-- CreateIndex
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_org_id_is_active_idx" ON "api_keys"("org_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_email_key" ON "super_admins"("email");

-- CreateIndex
CREATE INDEX "help_tickets_org_id_status_idx" ON "help_tickets"("org_id", "status");

-- CreateIndex
CREATE INDEX "help_tickets_status_created_at_idx" ON "help_tickets"("status", "created_at");

-- CreateIndex
CREATE INDEX "ticket_replies_ticket_id_created_at_idx" ON "ticket_replies"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "automation_rules_product_id_idx" ON "automation_rules"("product_id");

-- CreateIndex
CREATE INDEX "campaigns_product_id_idx" ON "campaigns"("product_id");

-- CreateIndex
CREATE INDEX "contacts_org_id_lead_score_idx" ON "contacts"("org_id", "lead_score");

-- CreateIndex
CREATE INDEX "conversations_channel_id_idx" ON "conversations"("channel_id");

-- CreateIndex
CREATE INDEX "conversations_channel_type_idx" ON "conversations"("channel_type");

-- CreateIndex
CREATE INDEX "conversations_org_id_channel_type_status_idx" ON "conversations"("org_id", "channel_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_org_id_channel_id_contact_identifier_key" ON "conversations"("org_id", "channel_id", "contact_identifier");

-- CreateIndex
CREATE UNIQUE INDEX "messages_external_message_id_key" ON "messages"("external_message_id");

-- CreateIndex
CREATE INDEX "messages_channel_id_idx" ON "messages"("channel_id");

-- CreateIndex
CREATE INDEX "messages_channel_type_idx" ON "messages"("channel_type");

-- CreateIndex
CREATE INDEX "messages_org_id_channel_id_created_at_idx" ON "messages"("org_id", "channel_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_external_message_id_idx" ON "messages"("external_message_id");

-- CreateIndex
CREATE INDEX "scheduled_messages_product_id_idx" ON "scheduled_messages"("product_id");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "whatsapp_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_rate_limits" ADD CONSTRAINT "channel_rate_limits_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_sequences" ADD CONSTRAINT "campaign_sequences_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_sequences" ADD CONSTRAINT "campaign_sequences_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "whatsapp_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_sequences" ADD CONSTRAINT "campaign_sequences_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_sequence_steps" ADD CONSTRAINT "campaign_sequence_steps_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "campaign_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_recipients" ADD CONSTRAINT "sequence_recipients_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "campaign_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_recipients" ADD CONSTRAINT "sequence_recipients_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_recipient_steps" ADD CONSTRAINT "sequence_recipient_steps_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "sequence_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_recipient_steps" ADD CONSTRAINT "sequence_recipient_steps_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "campaign_sequence_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_templates" ADD CONSTRAINT "sequence_templates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canned_responses" ADD CONSTRAINT "canned_responses_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_ad_entries" ADD CONSTRAINT "lead_ad_entries_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_ads_configs" ADD CONSTRAINT "lead_ads_configs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_message_daily" ADD CONSTRAINT "analytics_message_daily_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_message_hourly" ADD CONSTRAINT "analytics_message_hourly_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_response_time" ADD CONSTRAINT "analytics_response_time_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_conversion_daily" ADD CONSTRAINT "analytics_conversion_daily_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_campaign_summary" ADD CONSTRAINT "analytics_campaign_summary_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_trackings" ADD CONSTRAINT "sla_trackings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_trackings" ADD CONSTRAINT "sla_trackings_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "sla_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_breach_logs" ADD CONSTRAINT "sla_breach_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_breach_logs" ADD CONSTRAINT "sla_breach_logs_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "sla_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csat_surveys" ADD CONSTRAINT "csat_surveys_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csat_surveys" ADD CONSTRAINT "csat_surveys_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_flows" ADD CONSTRAINT "chatbot_flows_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_nodes" ADD CONSTRAINT "chatbot_nodes_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "chatbot_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "chatbot_flows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversation_summaries" ADD CONSTRAINT "ai_conversation_summaries_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_scoring_rules" ADD CONSTRAINT "lead_scoring_rules_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_score_history" ADD CONSTRAINT "contact_score_history_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_products" ADD CONSTRAINT "contact_products_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_products" ADD CONSTRAINT "contact_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_two_factors" ADD CONSTRAINT "user_two_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "widget_configs" ADD CONSTRAINT "widget_configs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_categories" ADD CONSTRAINT "kb_categories_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_articles" ADD CONSTRAINT "kb_articles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_articles" ADD CONSTRAINT "kb_articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "kb_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_articles" ADD CONSTRAINT "kb_articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_products" ADD CONSTRAINT "article_products_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "kb_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_products" ADD CONSTRAINT "article_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_documents" ADD CONSTRAINT "kb_documents_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_documents" ADD CONSTRAINT "kb_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "custom_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_tickets" ADD CONSTRAINT "help_tickets_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_tickets" ADD CONSTRAINT "help_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "help_tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "super_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_ai_memories" ADD CONSTRAINT "org_ai_memories_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "widget_sessions_unique_visitor_per_org" RENAME TO "widget_sessions_org_id_visitor_id_key";
