-- Org onboarding marker:
--   * set once the onboarding job has seeded an org's default master data
--   * NULL for existing orgs, so prisma/backfill-org-onboarding.js picks them up once

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "onboarded_at" TIMESTAMP(3);
