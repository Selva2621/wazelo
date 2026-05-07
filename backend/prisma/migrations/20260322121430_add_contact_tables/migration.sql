-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'INTERESTED', 'CONVERTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ContactSource" AS ENUM ('WHATSAPP', 'MANUAL', 'IMPORT', 'API');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CONTACT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CONTACT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'CONTACT_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'CONTACT_MERGED';
ALTER TYPE "AuditAction" ADD VALUE 'CONTACT_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'CONTACT_REASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'CONTACT_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'CONTACT_NOTE_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'CONTACT_TAG_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'CONTACT_TAG_REMOVED';
ALTER TYPE "AuditAction" ADD VALUE 'CONTACT_AUTO_CREATED';

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255),
    "email" VARCHAR(320),
    "avatar_url" VARCHAR(2048),
    "source" "ContactSource" NOT NULL DEFAULT 'WHATSAPP',
    "lead_status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "owner_id" UUID NOT NULL,
    "session_id" UUID,
    "metadata" JSONB,
    "merged_into_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_status_history" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "previous_status" "LeadStatus",
    "new_status" "LeadStatus" NOT NULL,
    "changed_by_id" UUID NOT NULL,
    "reason" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_owner_history" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "previous_owner_id" UUID,
    "new_owner_id" UUID NOT NULL,
    "assigned_by_id" UUID NOT NULL,
    "reason" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_owner_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(7),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_tags" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "added_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_notes" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "contact_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contacts_org_id_idx" ON "contacts"("org_id");

-- CreateIndex
CREATE INDEX "contacts_phone_number_idx" ON "contacts"("phone_number");

-- CreateIndex
CREATE INDEX "contacts_org_id_phone_number_idx" ON "contacts"("org_id", "phone_number");

-- CreateIndex
CREATE INDEX "contacts_owner_id_idx" ON "contacts"("owner_id");

-- CreateIndex
CREATE INDEX "contacts_org_id_owner_id_idx" ON "contacts"("org_id", "owner_id");

-- CreateIndex
CREATE INDEX "contacts_lead_status_idx" ON "contacts"("lead_status");

-- CreateIndex
CREATE INDEX "contacts_org_id_lead_status_idx" ON "contacts"("org_id", "lead_status");

-- CreateIndex
CREATE INDEX "contacts_source_idx" ON "contacts"("source");

-- CreateIndex
CREATE INDEX "contacts_created_at_idx" ON "contacts"("created_at");

-- CreateIndex
CREATE INDEX "contacts_org_id_created_at_idx" ON "contacts"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "contacts_deleted_at_idx" ON "contacts"("deleted_at");

-- CreateIndex
CREATE INDEX "contacts_merged_into_id_idx" ON "contacts"("merged_into_id");

-- CreateIndex
CREATE INDEX "contacts_org_id_name_idx" ON "contacts"("org_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_org_id_phone_number_deleted_at_key" ON "contacts"("org_id", "phone_number", "deleted_at");

-- CreateIndex
CREATE INDEX "contact_status_history_contact_id_idx" ON "contact_status_history"("contact_id");

-- CreateIndex
CREATE INDEX "contact_status_history_org_id_idx" ON "contact_status_history"("org_id");

-- CreateIndex
CREATE INDEX "contact_status_history_contact_id_created_at_idx" ON "contact_status_history"("contact_id", "created_at");

-- CreateIndex
CREATE INDEX "contact_owner_history_contact_id_idx" ON "contact_owner_history"("contact_id");

-- CreateIndex
CREATE INDEX "contact_owner_history_org_id_idx" ON "contact_owner_history"("org_id");

-- CreateIndex
CREATE INDEX "contact_owner_history_contact_id_created_at_idx" ON "contact_owner_history"("contact_id", "created_at");

-- CreateIndex
CREATE INDEX "tags_org_id_idx" ON "tags"("org_id");

-- CreateIndex
CREATE INDEX "tags_deleted_at_idx" ON "tags"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "tags_org_id_name_deleted_at_key" ON "tags"("org_id", "name", "deleted_at");

-- CreateIndex
CREATE INDEX "contact_tags_contact_id_idx" ON "contact_tags"("contact_id");

-- CreateIndex
CREATE INDEX "contact_tags_tag_id_idx" ON "contact_tags"("tag_id");

-- CreateIndex
CREATE INDEX "contact_tags_org_id_idx" ON "contact_tags"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "contact_tags_contact_id_tag_id_key" ON "contact_tags"("contact_id", "tag_id");

-- CreateIndex
CREATE INDEX "contact_notes_contact_id_idx" ON "contact_notes"("contact_id");

-- CreateIndex
CREATE INDEX "contact_notes_org_id_idx" ON "contact_notes"("org_id");

-- CreateIndex
CREATE INDEX "contact_notes_contact_id_created_at_idx" ON "contact_notes"("contact_id", "created_at");

-- CreateIndex
CREATE INDEX "contact_notes_deleted_at_idx" ON "contact_notes"("deleted_at");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_status_history" ADD CONSTRAINT "contact_status_history_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_owner_history" ADD CONSTRAINT "contact_owner_history_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_notes" ADD CONSTRAINT "contact_notes_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
