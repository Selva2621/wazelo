-- Super admin account management: create with a temporary password, disable/enable,
-- password change, and 2FA reset by another admin.

-- AlterEnum
ALTER TYPE "PlatformAuditAction" ADD VALUE 'SUPER_ADMIN_CREATED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'SUPER_ADMIN_DISABLED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'SUPER_ADMIN_ENABLED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'SUPER_ADMIN_PASSWORD_CHANGED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'TWO_FACTOR_RESET';

-- AlterTable
ALTER TABLE "super_admins"
  ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "disabled_at" TIMESTAMP(3),
  ADD COLUMN "created_by_id" UUID;
