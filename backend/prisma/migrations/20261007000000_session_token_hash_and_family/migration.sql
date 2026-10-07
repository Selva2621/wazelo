-- Refresh-token hardening:
--   * refresh_token now stores SHA-256(hex) of the JWT, never the token itself
--   * family_id groups every session rotated from one login (reuse => revoke family)
--   * rotated_at distinguishes "exchanged for a new token" from logout/admin revocation

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'REFRESH_TOKEN_REUSED';

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "family_id" UUID,
ADD COLUMN "rotated_at" TIMESTAMP(3);

-- Existing sessions each start their own family
UPDATE "sessions" SET "family_id" = "id" WHERE "family_id" IS NULL;

-- Hash existing tokens in place so current users stay signed in.
-- Raw JWTs contain '.', hex digests never do, so this is safe to re-run.
UPDATE "sessions"
SET "refresh_token" = encode(sha256(convert_to("refresh_token", 'UTF8')), 'hex')
WHERE "refresh_token" LIKE '%.%';

-- CreateIndex
CREATE INDEX "sessions_family_id_idx" ON "sessions"("family_id");
