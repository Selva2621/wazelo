-- Super admin auth hardening: account lockout, TOTP replay protection,
-- recovery codes, and DB-backed refresh sessions with reuse detection.

-- AlterEnum
ALTER TYPE "PlatformAuditAction" ADD VALUE 'SUPER_ADMIN_LOCKED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'SUPER_ADMIN_REFRESH_REUSED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'SUPER_ADMIN_SESSION_REVOKED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'TWO_FACTOR_SETUP_STARTED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'TWO_FACTOR_RECOVERY_CODE_USED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'TWO_FACTOR_RECOVERY_CODES_REGENERATED';

-- AlterTable
ALTER TABLE "super_admins"
  ADD COLUMN "totp_last_used_step" INTEGER,
  ADD COLUMN "recovery_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "locked_until" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "super_admin_sessions" (
    "id" UUID NOT NULL,
    "super_admin_id" UUID NOT NULL,
    "refresh_token" VARCHAR(64) NOT NULL,
    "family_id" UUID NOT NULL,
    "user_agent" VARCHAR(512),
    "ip_address" VARCHAR(45),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "rotated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "super_admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "super_admin_sessions_refresh_token_key" ON "super_admin_sessions"("refresh_token");
CREATE INDEX "super_admin_sessions_super_admin_id_idx" ON "super_admin_sessions"("super_admin_id");
CREATE INDEX "super_admin_sessions_family_id_idx" ON "super_admin_sessions"("family_id");
CREATE INDEX "super_admin_sessions_expires_at_idx" ON "super_admin_sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "super_admin_sessions" ADD CONSTRAINT "super_admin_sessions_super_admin_id_fkey"
  FOREIGN KEY ("super_admin_id") REFERENCES "super_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
