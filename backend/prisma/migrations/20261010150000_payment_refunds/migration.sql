-- Record-only refunds: a super admin logs a refund made in the gateway dashboard.

-- AlterEnum
ALTER TYPE "PlatformAuditAction" ADD VALUE 'PAYMENT_REFUND_RECORDED';

-- CreateTable
CREATE TABLE "payment_refunds" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "amount_in_cents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "external_refund_id" VARCHAR(255),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_refunds_payment_id_idx" ON "payment_refunds"("payment_id");
CREATE INDEX "payment_refunds_org_id_idx" ON "payment_refunds"("org_id");

-- AddForeignKey
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
