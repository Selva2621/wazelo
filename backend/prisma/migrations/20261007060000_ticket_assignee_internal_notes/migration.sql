-- Support queue: ticket assignee (super admin) and staff-only internal notes.

-- AlterTable
ALTER TABLE "help_tickets" ADD COLUMN "assigned_to_id" UUID,
ADD COLUMN "assigned_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ticket_replies" ADD COLUMN "is_internal" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "help_tickets_assigned_to_id_status_idx" ON "help_tickets"("assigned_to_id", "status");

-- AddForeignKey
ALTER TABLE "help_tickets" ADD CONSTRAINT "help_tickets_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "super_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterEnum
ALTER TYPE "PlatformAuditAction" ADD VALUE 'TICKET_ASSIGNED';
