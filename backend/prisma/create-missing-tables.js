'use strict';
const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected. Creating missing tables...');

  const stmts = [
    // Enums
    `DO $$ BEGIN CREATE TYPE "SlaMetricType" AS ENUM ('FIRST_RESPONSE_TIME','AVG_RESPONSE_TIME','RESOLUTION_TIME'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN CREATE TYPE "SlaPriority" AS ENUM ('LOW','NORMAL','HIGH','CRITICAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN CREATE TYPE "SlaBreachStatus" AS ENUM ('ACTIVE','ACKNOWLEDGED','RESOLVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN CREATE TYPE "ChatbotSessionStatus" AS ENUM ('ACTIVE','COMPLETED','ABANDONED','HANDED_OFF'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN CREATE TYPE "TicketStatus" AS ENUM ('OPEN','IN_PROGRESS','RESOLVED','CLOSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN CREATE TYPE "TicketCategory" AS ENUM ('BILLING','TECHNICAL','GENERAL','FEATURE_REQUEST'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN CREATE TYPE "TicketPriority" AS ENUM ('LOW','MEDIUM','HIGH','URGENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN CREATE TYPE "SequenceStatus" AS ENUM ('DRAFT','ACTIVE','PAUSED','COMPLETED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

    // Analytics
    `CREATE TABLE IF NOT EXISTS "analytics_message_daily" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "user_id" UUID,
      "date" DATE NOT NULL,
      "inbound_count" INT NOT NULL DEFAULT 0,
      "outbound_count" INT NOT NULL DEFAULT 0,
      "sent_count" INT NOT NULL DEFAULT 0,
      "delivered_count" INT NOT NULL DEFAULT 0,
      "read_count" INT NOT NULL DEFAULT 0,
      "failed_count" INT NOT NULL DEFAULT 0,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "analytics_message_daily_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "amd_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "unique_message_daily_org_user_date" ON "analytics_message_daily"("org_id","user_id","date")`,
    `CREATE INDEX IF NOT EXISTS "amd_org_date_idx" ON "analytics_message_daily"("org_id","date")`,

    `CREATE TABLE IF NOT EXISTS "analytics_message_hourly" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "hour" TIMESTAMPTZ NOT NULL,
      "inbound_count" INT NOT NULL DEFAULT 0,
      "outbound_count" INT NOT NULL DEFAULT 0,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "analytics_message_hourly_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "amh_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "unique_message_hourly_org_hour" ON "analytics_message_hourly"("org_id","hour")`,

    `CREATE TABLE IF NOT EXISTS "analytics_response_time" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "user_id" UUID,
      "date" DATE NOT NULL,
      "total_response_time_ms" BIGINT NOT NULL DEFAULT 0,
      "response_count" INT NOT NULL DEFAULT 0,
      "min_response_time_ms" INT,
      "max_response_time_ms" INT,
      "p50_response_time_ms" INT,
      "p95_response_time_ms" INT,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "analytics_response_time_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "art_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "unique_response_time_org_user_date" ON "analytics_response_time"("org_id","user_id","date")`,

    `CREATE TABLE IF NOT EXISTS "analytics_conversion_daily" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "date" DATE NOT NULL,
      "new_count" INT NOT NULL DEFAULT 0,
      "contacted_count" INT NOT NULL DEFAULT 0,
      "interested_count" INT NOT NULL DEFAULT 0,
      "converted_count" INT NOT NULL DEFAULT 0,
      "closed_count" INT NOT NULL DEFAULT 0,
      "transitions_json" JSONB NOT NULL DEFAULT '{}',
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "analytics_conversion_daily_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "acd_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "unique_conversion_daily_org_date" ON "analytics_conversion_daily"("org_id","date")`,

    `CREATE TABLE IF NOT EXISTS "analytics_campaign_summary" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "date" DATE NOT NULL,
      "total_campaigns" INT NOT NULL DEFAULT 0,
      "completed_campaigns" INT NOT NULL DEFAULT 0,
      "total_recipients" INT NOT NULL DEFAULT 0,
      "total_sent" INT NOT NULL DEFAULT 0,
      "total_delivered" INT NOT NULL DEFAULT 0,
      "total_failed" INT NOT NULL DEFAULT 0,
      "total_read" INT NOT NULL DEFAULT 0,
      "avg_delivery_rate_pct" FLOAT NOT NULL DEFAULT 0,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "analytics_campaign_summary_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "acs_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "unique_campaign_summary_org_date" ON "analytics_campaign_summary"("org_id","date")`,

    // SLA
    `CREATE TABLE IF NOT EXISTS "sla_policies" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "name" VARCHAR(255) NOT NULL,
      "description" VARCHAR(1000),
      "metric_type" "SlaMetricType" NOT NULL,
      "priority" "SlaPriority" NOT NULL DEFAULT 'NORMAL',
      "threshold_ms" INT NOT NULL,
      "warning_threshold_ms" INT,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "business_hours_only" BOOLEAN NOT NULL DEFAULT false,
      "business_hours_start" INT,
      "business_hours_end" INT,
      "business_days" JSONB,
      "timezone" VARCHAR(50),
      "notify_on_warning" BOOLEAN NOT NULL DEFAULT true,
      "notify_on_breach" BOOLEAN NOT NULL DEFAULT true,
      "notify_user_ids" JSONB,
      "escalation_policy" JSONB,
      "created_by_id" UUID NOT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "sla_policies_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id"),
      CONSTRAINT "sla_policies_creator_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "sla_policies_org_id_idx" ON "sla_policies"("org_id")`,

    `CREATE TABLE IF NOT EXISTS "sla_trackings" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "policy_id" UUID NOT NULL,
      "conversation_id" UUID NOT NULL,
      "assigned_user_id" UUID,
      "started_at" TIMESTAMPTZ NOT NULL,
      "responded_at" TIMESTAMPTZ,
      "resolved_at" TIMESTAMPTZ,
      "deadline_at" TIMESTAMPTZ NOT NULL,
      "warning_at" TIMESTAMPTZ,
      "elapsed_ms" INT,
      "is_breached" BOOLEAN NOT NULL DEFAULT false,
      "is_warning" BOOLEAN NOT NULL DEFAULT false,
      "paused_at" TIMESTAMPTZ,
      "paused_duration_ms" INT NOT NULL DEFAULT 0,
      "idempotency_key" VARCHAR(255) NOT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "sla_trackings_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "sla_trackings_idem_key" UNIQUE ("idempotency_key"),
      CONSTRAINT "sla_trackings_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id"),
      CONSTRAINT "sla_trackings_policy_fkey" FOREIGN KEY ("policy_id") REFERENCES "sla_policies"("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "sla_trackings_deadline_idx" ON "sla_trackings"("deadline_at")`,
    `CREATE INDEX IF NOT EXISTS "sla_trackings_org_breached_idx" ON "sla_trackings"("org_id","is_breached")`,

    `CREATE TABLE IF NOT EXISTS "sla_breach_logs" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "policy_id" UUID NOT NULL,
      "conversation_id" UUID NOT NULL,
      "assigned_user_id" UUID,
      "metric_type" "SlaMetricType" NOT NULL,
      "threshold_ms" INT NOT NULL,
      "actual_ms" INT NOT NULL,
      "status" "SlaBreachStatus" NOT NULL DEFAULT 'ACTIVE',
      "acknowledged_by" UUID,
      "acknowledged_at" TIMESTAMPTZ,
      "resolved_at" TIMESTAMPTZ,
      "idempotency_key" VARCHAR(255) NOT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "sla_breach_logs_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "sla_breach_logs_idem_key" UNIQUE ("idempotency_key"),
      CONSTRAINT "sla_breach_logs_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id"),
      CONSTRAINT "sla_breach_logs_policy_fkey" FOREIGN KEY ("policy_id") REFERENCES "sla_policies"("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "sla_breach_logs_org_idx" ON "sla_breach_logs"("org_id")`,

    // Teams
    `CREATE TABLE IF NOT EXISTS "teams" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "name" VARCHAR(255) NOT NULL,
      "manager_id" UUID NOT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      CONSTRAINT "teams_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "teams_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id"),
      CONSTRAINT "teams_manager_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "teams_org_id_idx" ON "teams"("org_id")`,

    `CREATE TABLE IF NOT EXISTS "team_members" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "team_id" UUID NOT NULL,
      "user_id" UUID NOT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "team_members_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "unique_member_per_team" UNIQUE ("team_id","user_id"),
      CONSTRAINT "team_members_team_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id"),
      CONSTRAINT "team_members_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id")
    )`,

    // API Keys
    `CREATE TABLE IF NOT EXISTS "api_keys" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "name" VARCHAR(255) NOT NULL,
      "key_hash" VARCHAR(255) NOT NULL,
      "key_prefix" VARCHAR(12) NOT NULL,
      "scopes" TEXT[] NOT NULL DEFAULT '{read}',
      "expires_at" TIMESTAMPTZ,
      "last_used_at" TIMESTAMPTZ,
      "last_used_ip" VARCHAR(45),
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "created_by_id" UUID NOT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "revoked_at" TIMESTAMPTZ,
      CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "api_keys_key_hash_key" UNIQUE ("key_hash"),
      CONSTRAINT "api_keys_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id"),
      CONSTRAINT "api_keys_creator_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "api_keys_org_id_idx" ON "api_keys"("org_id")`,

    // Custom Fields
    `CREATE TABLE IF NOT EXISTS "custom_field_definitions" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "entity" VARCHAR(50) NOT NULL,
      "field_name" VARCHAR(100) NOT NULL,
      "field_label" VARCHAR(255) NOT NULL,
      "field_type" VARCHAR(30) NOT NULL,
      "options" JSONB,
      "is_required" BOOLEAN NOT NULL DEFAULT false,
      "default_value" VARCHAR(1000),
      "sort_order" INT NOT NULL DEFAULT 0,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "cfd_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "cfd_org_entity_name" ON "custom_field_definitions"("org_id","entity","field_name")`,

    `CREATE TABLE IF NOT EXISTS "custom_field_values" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "field_id" UUID NOT NULL,
      "entity_id" UUID NOT NULL,
      "value" TEXT NOT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "cfv_field_entity_key" UNIQUE ("field_id","entity_id"),
      CONSTRAINT "cfv_field_fkey" FOREIGN KEY ("field_id") REFERENCES "custom_field_definitions"("id") ON DELETE CASCADE
    )`,

    // Knowledge Base
    `CREATE TABLE IF NOT EXISTS "kb_categories" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "name" VARCHAR(255) NOT NULL,
      "slug" VARCHAR(255) NOT NULL,
      "description" TEXT,
      "sort_order" INT NOT NULL DEFAULT 0,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "kb_categories_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "kb_categories_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "kb_categories_org_slug" ON "kb_categories"("org_id","slug")`,

    `CREATE TABLE IF NOT EXISTS "kb_articles" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "category_id" UUID,
      "title" VARCHAR(500) NOT NULL,
      "slug" VARCHAR(500) NOT NULL,
      "body" TEXT NOT NULL,
      "is_published" BOOLEAN NOT NULL DEFAULT false,
      "is_internal" BOOLEAN NOT NULL DEFAULT false,
      "author_id" UUID NOT NULL,
      "view_count" INT NOT NULL DEFAULT 0,
      "helpful_count" INT NOT NULL DEFAULT 0,
      "tags" TEXT[] NOT NULL DEFAULT '{}',
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      CONSTRAINT "kb_articles_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "kb_articles_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id"),
      CONSTRAINT "kb_articles_cat_fkey" FOREIGN KEY ("category_id") REFERENCES "kb_categories"("id"),
      CONSTRAINT "kb_articles_author_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "kb_articles_org_slug" ON "kb_articles"("org_id","slug")`,

    `CREATE TABLE IF NOT EXISTS "kb_documents" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "flow_id" UUID,
      "title" VARCHAR(255) NOT NULL,
      "filename" VARCHAR(255) NOT NULL,
      "file_url" TEXT NOT NULL,
      "content_type" VARCHAR(100) NOT NULL,
      "file_size" INT NOT NULL,
      "extracted_text" TEXT,
      "status" VARCHAR(20) NOT NULL DEFAULT 'PROCESSING',
      "uploaded_by_id" UUID NOT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      CONSTRAINT "kb_documents_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "kb_documents_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id"),
      CONSTRAINT "kb_documents_uploader_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "article_products" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "article_id" UUID NOT NULL,
      "product_id" UUID NOT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "article_products_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "article_products_unique" UNIQUE ("article_id","product_id"),
      CONSTRAINT "article_products_article_fkey" FOREIGN KEY ("article_id") REFERENCES "kb_articles"("id") ON DELETE CASCADE,
      CONSTRAINT "article_products_product_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id")
    )`,

    // Lead Scoring
    `CREATE TABLE IF NOT EXISTS "lead_scoring_rules" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "name" VARCHAR(255) NOT NULL,
      "description" TEXT,
      "signal" VARCHAR(100) NOT NULL,
      "condition" JSONB,
      "points" INT NOT NULL,
      "max_per_contact" INT NOT NULL DEFAULT 0,
      "enabled" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "lead_scoring_rules_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "lsr_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "contact_score_history" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "contact_id" UUID NOT NULL,
      "org_id" UUID NOT NULL,
      "previous_score" INT NOT NULL,
      "new_score" INT NOT NULL,
      "delta" INT NOT NULL,
      "reason" VARCHAR(500) NOT NULL,
      "rule_id" UUID,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "contact_score_history_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "csh_contact_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id")
    )`,

    // CSAT
    `CREATE TABLE IF NOT EXISTS "csat_surveys" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "conversation_id" UUID NOT NULL,
      "contact_phone" VARCHAR(20) NOT NULL,
      "agent_id" UUID NOT NULL,
      "rating" INT,
      "comment" TEXT,
      "sent_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "responded_at" TIMESTAMPTZ,
      "channel_type" VARCHAR(50),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "product_id" UUID,
      CONSTRAINT "csat_surveys_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "unique_survey_per_conversation" UNIQUE ("conversation_id"),
      CONSTRAINT "csat_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id"),
      CONSTRAINT "csat_product_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id")
    )`,

    // Chatbot
    `CREATE TABLE IF NOT EXISTS "chatbot_flows" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "name" VARCHAR(255) NOT NULL,
      "description" TEXT,
      "trigger" JSONB NOT NULL,
      "is_active" BOOLEAN NOT NULL DEFAULT false,
      "ai_enabled" BOOLEAN NOT NULL DEFAULT false,
      "ai_system_prompt" TEXT,
      "use_knowledge_base" BOOLEAN NOT NULL DEFAULT false,
      "product_ids" JSONB,
      "version" INT NOT NULL DEFAULT 1,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      CONSTRAINT "chatbot_flows_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "chatbot_flows_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "chatbot_nodes" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "flow_id" UUID NOT NULL,
      "type" VARCHAR(50) NOT NULL,
      "data" JSONB NOT NULL,
      "position" JSONB NOT NULL,
      "next_nodes" JSONB NOT NULL,
      CONSTRAINT "chatbot_nodes_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "chatbot_nodes_flow_fkey" FOREIGN KEY ("flow_id") REFERENCES "chatbot_flows"("id") ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS "chatbot_sessions" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "flow_id" UUID NOT NULL,
      "org_id" UUID NOT NULL,
      "contact_id" UUID NOT NULL,
      "conversation_id" UUID NOT NULL,
      "current_node_id" UUID,
      "variables" JSONB NOT NULL DEFAULT '{}',
      "status" "ChatbotSessionStatus" NOT NULL DEFAULT 'ACTIVE',
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "completed_at" TIMESTAMPTZ,
      CONSTRAINT "chatbot_sessions_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "chatbot_sessions_flow_fkey" FOREIGN KEY ("flow_id") REFERENCES "chatbot_flows"("id"),
      CONSTRAINT "chatbot_sessions_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    )`,

    // Contact Products
    `CREATE TABLE IF NOT EXISTS "contact_products" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "contact_id" UUID NOT NULL,
      "product_id" UUID NOT NULL,
      "org_id" UUID NOT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "contact_products_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "contact_products_unique" UNIQUE ("contact_id","product_id"),
      CONSTRAINT "contact_products_contact_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id"),
      CONSTRAINT "contact_products_product_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id")
    )`,

    // Sequences
    `CREATE TABLE IF NOT EXISTS "sequence_templates" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "name" VARCHAR(255) NOT NULL,
      "category" VARCHAR(100),
      "message_type" "MessageType" NOT NULL DEFAULT 'TEXT',
      "message_body" TEXT,
      "media_url" VARCHAR(2048),
      "media_mime_type" VARCHAR(100),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      CONSTRAINT "sequence_templates_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "st_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "campaign_sequences" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "session_id" UUID NOT NULL,
      "name" VARCHAR(255) NOT NULL,
      "description" TEXT,
      "status" "SequenceStatus" NOT NULL DEFAULT 'DRAFT',
      "audience_type" "CampaignAudienceType" NOT NULL DEFAULT 'FILTERED',
      "audience_filters" JSONB,
      "exit_on_reply" BOOLEAN NOT NULL DEFAULT true,
      "created_by_id" UUID NOT NULL,
      "started_at" TIMESTAMPTZ,
      "completed_at" TIMESTAMPTZ,
      "total_recipients" INT NOT NULL DEFAULT 0,
      "completed_count" INT NOT NULL DEFAULT 0,
      "exited_count" INT NOT NULL DEFAULT 0,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      CONSTRAINT "campaign_sequences_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "cs_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id"),
      CONSTRAINT "cs_session_fkey" FOREIGN KEY ("session_id") REFERENCES "whatsapp_sessions"("id"),
      CONSTRAINT "cs_creator_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
    )`,

    // Help Tickets
    `CREATE TABLE IF NOT EXISTS "help_tickets" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "user_id" UUID NOT NULL,
      "title" VARCHAR(255) NOT NULL,
      "description" TEXT NOT NULL,
      "category" "TicketCategory" NOT NULL,
      "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
      "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
      "attachment_url" TEXT,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "closed_at" TIMESTAMPTZ,
      CONSTRAINT "help_tickets_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ht_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id"),
      CONSTRAINT "ht_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "ticket_replies" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "ticket_id" UUID NOT NULL,
      "body" TEXT NOT NULL,
      "user_id" UUID,
      "super_admin_id" UUID,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "ticket_replies_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "tr_ticket_fkey" FOREIGN KEY ("ticket_id") REFERENCES "help_tickets"("id"),
      CONSTRAINT "tr_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
      CONSTRAINT "tr_sadmin_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "super_admins"("id")
    )`,

    // Lead Ads
    `CREATE TABLE IF NOT EXISTS "lead_ad_entries" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
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
      "processed_at" TIMESTAMPTZ,
      "raw_webhook_data" JSONB,
      "channel_id" UUID,
      "retry_count" INT NOT NULL DEFAULT 0,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "lead_ad_entries_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "unique_lead_per_org" UNIQUE ("org_id","leadgen_id"),
      CONSTRAINT "lae_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "lae_org_status_idx" ON "lead_ad_entries"("org_id","status")`,

    `CREATE TABLE IF NOT EXISTS "lead_ads_configs" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "encrypted_app_secret" TEXT,
      "webhook_verify_token" VARCHAR(255),
      "is_configured" BOOLEAN NOT NULL DEFAULT false,
      "last_verified_at" TIMESTAMPTZ,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "lead_ads_configs_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "lead_ads_configs_org_key" UNIQUE ("org_id"),
      CONSTRAINT "lac_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    )`,
  ];

  let ok = 0, fail = 0;
  for (const sql of stmts) {
    try {
      await client.query(sql);
      process.stdout.write('.');
      ok++;
    } catch(e) {
      console.log('');
      console.error('FAIL:', e.message.slice(0, 120));
      console.error('  SQL:', sql.trim().slice(0, 80));
      fail++;
    }
  }
  console.log('');
  console.log(`Done: ${ok} OK, ${fail} failed`);
  await client.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
