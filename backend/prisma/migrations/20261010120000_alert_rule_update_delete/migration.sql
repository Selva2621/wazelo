-- Alert rules can now be edited, paused and deleted from the super admin portal.

-- AlterEnum
ALTER TYPE "PlatformAuditAction" ADD VALUE 'ALERT_RULE_UPDATED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'ALERT_RULE_DELETED';
