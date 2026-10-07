-- Platform announcements: super admin messages shown as a banner in tenant apps.

-- CreateEnum
CREATE TYPE "AnnouncementSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AnnouncementTarget" AS ENUM ('ALL', 'PLAN', 'ORG');

-- AlterEnum
ALTER TYPE "PlatformAuditAction" ADD VALUE 'ANNOUNCEMENT_CREATED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'ANNOUNCEMENT_ARCHIVED';

-- CreateTable
CREATE TABLE "platform_announcements" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "severity" "AnnouncementSeverity" NOT NULL DEFAULT 'INFO',
    "target_type" "AnnouncementTarget" NOT NULL DEFAULT 'ALL',
    "target_plan_slug" VARCHAR(100),
    "target_org_id" UUID,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "dismissible" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_dismissals" (
    "id" UUID NOT NULL,
    "announcement_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "dismissed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_dismissals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_announcements_archived_at_starts_at_idx" ON "platform_announcements"("archived_at", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_dismissals_announcement_id_user_id_key" ON "announcement_dismissals"("announcement_id", "user_id");

-- CreateIndex
CREATE INDEX "announcement_dismissals_user_id_idx" ON "announcement_dismissals"("user_id");

-- AddForeignKey
ALTER TABLE "announcement_dismissals" ADD CONSTRAINT "announcement_dismissals_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "platform_announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
