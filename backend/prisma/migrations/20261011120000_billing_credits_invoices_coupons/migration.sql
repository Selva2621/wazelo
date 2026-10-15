-- Account credits, manual invoices and coupons. Additive / relaxing only:
-- new enums, enum values, tables and indexes; two NOT NULL constraints dropped.

-- CreateEnum
CREATE TYPE "CreditEntryKind" AS ENUM ('GRANT', 'APPLIED', 'REVOKED');

-- CreateEnum
CREATE TYPE "CouponKind" AS ENUM ('PERCENT', 'FIXED');

-- AlterEnum
ALTER TYPE "PlatformAuditAction" ADD VALUE 'CREDIT_GRANTED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'CREDIT_REVOKED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'INVOICE_CREATED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'INVOICE_MARKED_PAID';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'INVOICE_VOIDED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'COUPON_CREATED';
ALTER TYPE "PlatformAuditAction" ADD VALUE 'COUPON_DEACTIVATED';

-- AlterTable: manual invoices (and their manual payments) may have no subscription.
-- The existing foreign keys (ON DELETE RESTRICT) are unchanged.
ALTER TABLE "payments" ALTER COLUMN "subscription_id" DROP NOT NULL;
ALTER TABLE "invoices" ALTER COLUMN "subscription_id" DROP NOT NULL;

-- CreateTable: append-only credit ledger; balance = SUM(amount_in_cents) per org + currency
CREATE TABLE "org_credit_entries" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "amount_in_cents" INTEGER NOT NULL,
    "kind" "CreditEntryKind" NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "invoice_id" UUID,
    "idempotency_key" VARCHAR(255),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_credit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "kind" "CouponKind" NOT NULL,
    "percent_off" INTEGER,
    "amount_off_in_cents" INTEGER,
    "currency" VARCHAR(3),
    "max_redemptions" INTEGER,
    "redemption_count" INTEGER NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "applies_to_plan_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "first_payment_only" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "subscription_id" UUID,
    "invoice_id" UUID,
    "discount_in_cents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_credit_entries_idempotency_key_key" ON "org_credit_entries"("idempotency_key");
CREATE INDEX "org_credit_entries_org_id_currency_idx" ON "org_credit_entries"("org_id", "currency");
CREATE INDEX "org_credit_entries_org_id_created_at_idx" ON "org_credit_entries"("org_id", "created_at");
CREATE INDEX "org_credit_entries_invoice_id_idx" ON "org_credit_entries"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");
CREATE INDEX "coupons_active_idx" ON "coupons"("active");

-- CreateIndex: one redemption per org per coupon
CREATE UNIQUE INDEX "coupon_redemptions_coupon_id_org_id_key" ON "coupon_redemptions"("coupon_id", "org_id");
CREATE INDEX "coupon_redemptions_org_id_idx" ON "coupon_redemptions"("org_id");

-- AddForeignKey
ALTER TABLE "org_credit_entries" ADD CONSTRAINT "org_credit_entries_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "org_credit_entries" ADD CONSTRAINT "org_credit_entries_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
