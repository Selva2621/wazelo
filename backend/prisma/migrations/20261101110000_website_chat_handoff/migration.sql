-- Website chat: consent capture, handover to a team member, lead decision, full timeline.

-- New names only
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WEBSITE_HANDOFF';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'WIDGET_CONSENT_GIVEN';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'WIDGET_CHAT_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'WIDGET_CHAT_DECLINED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'WIDGET_CHAT_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'WIDGET_CHAT_ENDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'WIDGET_LEAD_SAVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'WIDGET_LEAD_DISMISSED';

-- Who is answering each website chat, and what came of it
ALTER TABLE "widget_sessions"
  ADD COLUMN "state" VARCHAR(10) NOT NULL DEFAULT 'AI',
  ADD COLUMN "assigned_to_id" UUID,
  ADD COLUMN "handoff_requested_at" TIMESTAMP(3),
  ADD COLUMN "handoff_reason" VARCHAR(20),
  ADD COLUMN "accepted_at" TIMESTAMP(3),
  ADD COLUMN "bot_miss_streak" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "consent_channel" VARCHAR(10),
  ADD COLUMN "consent_at" TIMESTAMP(3),
  ADD COLUMN "contact_id" UUID,
  ADD COLUMN "welcome_pending" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "welcome_at" TIMESTAMP(3),
  ADD COLUMN "lead_decision" VARCHAR(10),
  ADD COLUMN "ended_at" TIMESTAMP(3),
  ADD COLUMN "end_reason" VARCHAR(20);

CREATE INDEX "widget_sessions_org_id_state_idx" ON "widget_sessions"("org_id", "state");
CREATE INDEX "widget_sessions_assigned_to_id_idx" ON "widget_sessions"("assigned_to_id");

-- Which team member wrote a reply
ALTER TABLE "widget_messages" ADD COLUMN "sender_user_id" UUID;

-- Handover settings
ALTER TABLE "bot_settings"
  ADD COLUMN "handoff_mode" VARCHAR(10) NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "accept_timeout_sec" INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN "wait_timeout_min" INTEGER NOT NULL DEFAULT 5;

-- Timeline of each website chat
CREATE TABLE "widget_chat_events" (
  "id" UUID NOT NULL,
  "org_id" UUID NOT NULL,
  "session_id" UUID NOT NULL,
  "type" VARCHAR(30) NOT NULL,
  "actor_type" VARCHAR(10) NOT NULL,
  "actor_id" UUID,
  "data" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "widget_chat_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "widget_chat_events_session_id_created_at_idx" ON "widget_chat_events"("session_id", "created_at");
CREATE INDEX "widget_chat_events_org_id_created_at_idx" ON "widget_chat_events"("org_id", "created_at");
CREATE INDEX "widget_chat_events_org_id_type_idx" ON "widget_chat_events"("org_id", "type");
ALTER TABLE "widget_chat_events" ADD CONSTRAINT "widget_chat_events_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "widget_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Chats offered to team members
CREATE TABLE "widget_handoff_offers" (
  "id" UUID NOT NULL,
  "org_id" UUID NOT NULL,
  "session_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "status" VARCHAR(10) NOT NULL DEFAULT 'OFFERED',
  "offered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3),
  "responded_at" TIMESTAMP(3),
  CONSTRAINT "widget_handoff_offers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "widget_handoff_offers_session_id_status_idx" ON "widget_handoff_offers"("session_id", "status");
CREATE INDEX "widget_handoff_offers_user_id_status_idx" ON "widget_handoff_offers"("user_id", "status");
CREATE INDEX "widget_handoff_offers_org_id_status_idx" ON "widget_handoff_offers"("org_id", "status");
ALTER TABLE "widget_handoff_offers" ADD CONSTRAINT "widget_handoff_offers_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "widget_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
