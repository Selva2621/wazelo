-- Super admins can edit, delete (30-day restore), restore and export organizations.

-- AlterEnum
ALTER TYPE "PlatformAuditAction" ADD VALUE 'ORG_UPDATED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'ORG_DELETED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'ORG_RESTORED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'ORG_EXPORTED';
