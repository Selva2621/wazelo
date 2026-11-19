-- AI bot: pause per chat + unanswered streak
ALTER TABLE "conversations" ADD COLUMN "bot_paused_until" TIMESTAMP(3);
ALTER TABLE "conversations" ADD COLUMN "bot_miss_streak" INTEGER NOT NULL DEFAULT 0;

-- Websites: optional weekly re-read
ALTER TABLE "kb_sources" ADD COLUMN "auto_resync" BOOLEAN NOT NULL DEFAULT false;

-- Questions the bot couldn't answer
CREATE TABLE "kb_misses" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "question_key" VARCHAR(300) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "channel" VARCHAR(20) NOT NULL,
    "last_conversation_id" UUID,
    "last_asked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_misses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "kb_misses_org_id_question_key_key" ON "kb_misses"("org_id", "question_key");
CREATE INDEX "kb_misses_org_id_resolved_at_idx" ON "kb_misses"("org_id", "resolved_at");

ALTER TABLE "kb_misses" ADD CONSTRAINT "kb_misses_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Bot handover + opening hours, one row per org
CREATE TABLE "bot_settings" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "handoff_message" VARCHAR(500) NOT NULL DEFAULT 'Thanks! Someone from our team will reply to you here shortly.',
    "hours_enabled" BOOLEAN NOT NULL DEFAULT false,
    "open_minute" INTEGER NOT NULL DEFAULT 540,
    "close_minute" INTEGER NOT NULL DEFAULT 1200,
    "open_days" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "after_hours_message" VARCHAR(500) NOT NULL DEFAULT 'Thanks! Our team is offline right now and will reply when we''re back.',
    "pause_hours" INTEGER NOT NULL DEFAULT 24,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bot_settings_org_id_key" ON "bot_settings"("org_id");

ALTER TABLE "bot_settings" ADD CONSTRAINT "bot_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
