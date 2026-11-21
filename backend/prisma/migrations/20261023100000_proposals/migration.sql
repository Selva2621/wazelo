-- Proposals: quotes sent to clients with a public accept / request-changes link
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'CHANGES_REQUESTED');

ALTER TYPE "NotificationType" ADD VALUE 'PROPOSAL_VIEWED';
ALTER TYPE "NotificationType" ADD VALUE 'PROPOSAL_RESPONSE';

CREATE TABLE "proposals" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "contact_id" UUID NOT NULL,
    "deal_id" UUID,
    "title" VARCHAR(300) NOT NULL,
    "intro" TEXT,
    "scope" JSONB NOT NULL DEFAULT '[]',
    "items" JSONB NOT NULL DEFAULT '[]',
    "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL,
    "terms" TEXT,
    "valid_until" TIMESTAMP(3),
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "public_token" VARCHAR(64) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "viewed_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "response_note" TEXT,
    "accepted_by" VARCHAR(200),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "proposals_public_token_key" ON "proposals"("public_token");
CREATE UNIQUE INDEX "proposals_org_id_number_key" ON "proposals"("org_id", "number");
CREATE INDEX "proposals_org_id_status_idx" ON "proposals"("org_id", "status");
CREATE INDEX "proposals_org_id_contact_id_idx" ON "proposals"("org_id", "contact_id");
CREATE INDEX "proposals_deal_id_idx" ON "proposals"("deal_id");

ALTER TABLE "proposals" ADD CONSTRAINT "proposals_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
