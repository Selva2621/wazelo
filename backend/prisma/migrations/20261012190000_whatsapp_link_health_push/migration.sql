-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'WHATSAPP_SESSION_UNSTABLE';
ALTER TYPE "NotificationType" ADD VALUE 'WHATSAPP_PHONE_INACTIVE';

-- AlterTable
ALTER TABLE "whatsapp_sessions" ADD COLUMN "last_phone_activity_at" TIMESTAMP(3);

-- Existing sessions start their 14-day phone clock now, so nobody is warned on deploy
UPDATE "whatsapp_sessions" SET "last_phone_activity_at" = NOW() WHERE "deleted_at" IS NULL;

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" VARCHAR(255) NOT NULL,
    "auth" VARCHAR(255) NOT NULL,
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");
