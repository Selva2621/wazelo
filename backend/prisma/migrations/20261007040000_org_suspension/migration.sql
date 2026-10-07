-- Org suspension (super admin) + platform audit actions for org/subscription management.
-- Existing orgs default to ACTIVE.

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "status" "OrgStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "suspended_at" TIMESTAMP(3),
ADD COLUMN "suspend_reason" VARCHAR(500);

-- AlterEnum
ALTER TYPE "PlatformAuditAction" ADD VALUE 'ORG_SUSPENDED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'ORG_REACTIVATED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'SUBSCRIPTION_CANCELLED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'SUBSCRIPTION_PLAN_CHANGED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'SUBSCRIPTION_TRIAL_EXTENDED';
