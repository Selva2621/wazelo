-- Super admins can retry failed background jobs; record it.

-- AlterEnum
ALTER TYPE "PlatformAuditAction" ADD VALUE 'JOB_RETRIED';
