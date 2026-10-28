-- Campaign "Replied": who wrote back after a campaign reached them (additive only)

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN "replied_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "campaign_recipients" ADD COLUMN "replied_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "campaign_recipients_org_id_contact_phone_idx" ON "campaign_recipients"("org_id", "contact_phone");
