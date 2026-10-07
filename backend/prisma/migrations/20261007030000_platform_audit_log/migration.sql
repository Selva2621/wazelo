-- Platform audit log: every super admin action, append-only.
-- Separate from audit_logs (tenant), whose user_id is a FK to users.

-- CreateEnum
CREATE TYPE "PlatformActorType" AS ENUM ('SUPER_ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PlatformAuditAction" AS ENUM (
  'SUPER_ADMIN_LOGIN',
  'SUPER_ADMIN_LOGIN_FAILED',
  'SUPER_ADMIN_LOGOUT',
  'TWO_FACTOR_ENABLED',
  'TWO_FACTOR_DISABLED',
  'PLAN_CREATED',
  'PLAN_UPDATED',
  'TICKET_CREATED',
  'TICKET_REPLIED',
  'TICKET_STATUS_CHANGED'
);

-- CreateTable
CREATE TABLE "platform_audit_logs" (
    "id" UUID NOT NULL,
    "actor_type" "PlatformActorType" NOT NULL,
    "actor_id" UUID,
    "actor_email" VARCHAR(320),
    "action" "PlatformAuditAction" NOT NULL,
    "target_type" VARCHAR(100),
    "target_id" VARCHAR(255),
    "org_id" UUID,
    "metadata" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(512),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_audit_logs_created_at_idx" ON "platform_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "platform_audit_logs_actor_id_created_at_idx" ON "platform_audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "platform_audit_logs_org_id_created_at_idx" ON "platform_audit_logs"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "platform_audit_logs_action_created_at_idx" ON "platform_audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "platform_audit_logs_target_type_target_id_idx" ON "platform_audit_logs"("target_type", "target_id");
