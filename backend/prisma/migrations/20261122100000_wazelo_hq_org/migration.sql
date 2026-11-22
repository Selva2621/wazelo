-- Wazelo HQ: the platform's own workspace
ALTER TABLE "organizations" ADD COLUMN "is_internal" BOOLEAN NOT NULL DEFAULT false;

-- At most one HQ org
CREATE UNIQUE INDEX "organizations_single_internal" ON "organizations" ("is_internal") WHERE "is_internal" = true;

-- HQ user that stands for a super admin
ALTER TABLE "users" ADD COLUMN "super_admin_id" UUID;
CREATE UNIQUE INDEX "users_super_admin_id_key" ON "users"("super_admin_id");

-- One-time code a super admin uses to open HQ
ALTER TYPE "TokenType" ADD VALUE 'HQ_HANDOFF';

ALTER TYPE "PlatformAuditAction" ADD VALUE 'HQ_CREATED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'HQ_OPENED';
