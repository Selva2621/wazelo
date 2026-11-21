-- One row per automatic bot decision (no message text): bot health, suspicious messages, tracing
CREATE TYPE "AiReplyOutcome" AS ENUM ('ANSWERED', 'NOT_FOUND', 'BLOCKED', 'HANDED_OFF', 'LIMITED', 'NO_CREDITS', 'FAILED');

CREATE TABLE "ai_reply_logs" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "conversation_id" UUID,
    "widget_session_id" UUID,
    "flow_id" UUID,
    "outcome" "AiReplyOutcome" NOT NULL,
    "reason" VARCHAR(40),
    "model" VARCHAR(100),
    "tokens" INTEGER,
    "charged" BOOLEAN NOT NULL DEFAULT false,
    "sources_used" INTEGER NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_reply_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_reply_logs_org_id_created_at_idx" ON "ai_reply_logs"("org_id", "created_at");
CREATE INDEX "ai_reply_logs_org_id_outcome_created_at_idx" ON "ai_reply_logs"("org_id", "outcome", "created_at");

ALTER TABLE "ai_reply_logs" ADD CONSTRAINT "ai_reply_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
