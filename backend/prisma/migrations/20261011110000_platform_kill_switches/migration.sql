-- Platform-wide per-feature kill switches. Additive only.

-- AlterEnum
ALTER TYPE "PlatformAuditAction" ADD VALUE 'KILL_SWITCH_ON';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'KILL_SWITCH_OFF';

-- CreateTable: a missing row means the feature is on
CREATE TABLE "platform_kill_switches" (
    "feature" VARCHAR(50) NOT NULL,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "reason" VARCHAR(500),
    "disabled_by_id" UUID,
    "disabled_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_kill_switches_pkey" PRIMARY KEY ("feature")
);
