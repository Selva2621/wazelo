-- AI credits on top of the plan: packs a super admin prices, a purchased balance
-- per org, and an append-only ledger of purchases and charged AI actions.
ALTER TYPE "PlatformAuditAction" ADD VALUE IF NOT EXISTS 'AI_CREDIT_PACK_CREATED';
ALTER TYPE "PlatformAuditAction" ADD VALUE IF NOT EXISTS 'AI_CREDIT_PACK_UPDATED';

CREATE TYPE "AiCreditEntryKind" AS ENUM ('PURCHASE', 'USAGE');

CREATE TABLE "ai_credit_packs" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "credits" INTEGER NOT NULL,
    "price_in_cents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_credit_packs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "org_ai_credit_balances" (
    "org_id" UUID NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_ai_credit_balances_pkey" PRIMARY KEY ("org_id")
);

CREATE TABLE "ai_credit_entries" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "kind" "AiCreditEntryKind" NOT NULL,
    "action" VARCHAR(50),
    "plan_credits" INTEGER NOT NULL DEFAULT 0,
    "purchased_credits" INTEGER NOT NULL DEFAULT 0,
    "pack_id" UUID,
    "payment_id" UUID,
    "idempotency_key" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_credit_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_credit_packs_currency_is_active_idx" ON "ai_credit_packs"("currency", "is_active");
CREATE UNIQUE INDEX "ai_credit_entries_idempotency_key_key" ON "ai_credit_entries"("idempotency_key");
CREATE INDEX "ai_credit_entries_org_id_created_at_idx" ON "ai_credit_entries"("org_id", "created_at");
CREATE INDEX "ai_credit_entries_created_at_idx" ON "ai_credit_entries"("created_at");

ALTER TABLE "org_ai_credit_balances" ADD CONSTRAINT "org_ai_credit_balances_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_credit_entries" ADD CONSTRAINT "ai_credit_entries_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
