-- Plan archive/delete, announcement edit, and the super admin notification inbox. Additive only.

-- AlterEnum
ALTER TYPE "PlatformAuditAction" ADD VALUE 'PLAN_ARCHIVED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'PLAN_UNARCHIVED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'PLAN_DELETED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'ANNOUNCEMENT_UPDATED';

-- AlterTable: archived plans stay resolvable for existing subscribers (unlike deleted_at)
ALTER TABLE "plans" ADD COLUMN "archived_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "super_admin_notifications" (
    "id" UUID NOT NULL,
    "super_admin_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "link" VARCHAR(500),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "super_admin_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "super_admin_notifications_super_admin_id_read_at_idx" ON "super_admin_notifications"("super_admin_id", "read_at");

-- CreateIndex
CREATE INDEX "super_admin_notifications_super_admin_id_created_at_idx" ON "super_admin_notifications"("super_admin_id", "created_at");

-- AddForeignKey
ALTER TABLE "super_admin_notifications" ADD CONSTRAINT "super_admin_notifications_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "super_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
