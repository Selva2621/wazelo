-- Super admin session security:
--   * token_version — bumped on logout; tokens carrying an older version are rejected
--   * totp_secret / totp_enabled — authenticator-app 2FA (secret stored encrypted)
--   * last_login_at — shown on the security page

-- AlterTable
ALTER TABLE "super_admins" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "totp_secret" VARCHAR(512),
ADD COLUMN "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "last_login_at" TIMESTAMP(3);
