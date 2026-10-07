-- Per-org limit/feature overrides, managed only by super admins.
-- Separate from feature_flags, which tenant admins can edit.

-- CreateEnum
CREATE TYPE "EntitlementKind" AS ENUM ('LIMIT', 'FEATURE');

-- AlterEnum
ALTER TYPE "PlatformAuditAction" ADD VALUE 'ENTITLEMENT_OVERRIDE_SET';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'ENTITLEMENT_OVERRIDE_REMOVED';

-- CreateTable
CREATE TABLE "org_entitlement_overrides" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "kind" "EntitlementKind" NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "limit_value" INTEGER,
    "enabled" BOOLEAN,
    "reason" VARCHAR(500) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_entitlement_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_entitlement_overrides_org_id_kind_key_key" ON "org_entitlement_overrides"("org_id", "kind", "key");

-- CreateIndex
CREATE INDEX "org_entitlement_overrides_org_id_idx" ON "org_entitlement_overrides"("org_id");

-- AddForeignKey
ALTER TABLE "org_entitlement_overrides" ADD CONSTRAINT "org_entitlement_overrides_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
