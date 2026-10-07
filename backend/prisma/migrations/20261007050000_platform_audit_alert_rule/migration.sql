-- Alert rules are now managed from the super admin portal; record their creation.

-- AlterEnum
ALTER TYPE "PlatformAuditAction" ADD VALUE 'ALERT_RULE_CREATED';
