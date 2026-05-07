-- AlterTable: add pre_chat_form_enabled to widget_configs
-- ALTER TABLE "widget_configs" ADD COLUMN "pre_chat_form_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: widget_sessions
CREATE TABLE "widget_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "visitor_id" VARCHAR(64) NOT NULL,
    "visitor_name" VARCHAR(255),
    "visitor_phone" VARCHAR(20),
    "visitor_email" VARCHAR(320),
    "page_url" VARCHAR(2048),
    "user_agent" VARCHAR(512),
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "widget_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: widget_messages
CREATE TABLE "widget_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "sender" VARCHAR(10) NOT NULL,
    "body" VARCHAR(4096) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "widget_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "widget_sessions_unique_visitor_per_org" ON "widget_sessions"("org_id", "visitor_id");
CREATE INDEX "widget_sessions_org_id_idx" ON "widget_sessions"("org_id");
CREATE INDEX "widget_messages_session_id_idx" ON "widget_messages"("session_id");
CREATE INDEX "widget_messages_org_id_idx" ON "widget_messages"("org_id");

-- AddForeignKey
ALTER TABLE "widget_sessions" ADD CONSTRAINT "widget_sessions_org_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "widget_messages" ADD CONSTRAINT "widget_messages_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "widget_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "widget_messages" ADD CONSTRAINT "widget_messages_org_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
