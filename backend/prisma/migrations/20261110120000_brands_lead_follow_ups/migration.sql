-- Brands group products; each product has a lead team and a reminder time
CREATE TABLE "brands" (
  "id" UUID NOT NULL,
  "org_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "manager_id" UUID,
  "session_id" UUID,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "brands_org_id_name_deleted_at_key" ON "brands"("org_id", "name", "deleted_at");
CREATE INDEX "brands_org_id_idx" ON "brands"("org_id");
ALTER TABLE "brands" ADD CONSTRAINT "brands_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "products"
  ADD COLUMN "brand_id" UUID,
  ADD COLUMN "lead_handler_ids" UUID[] DEFAULT ARRAY[]::UUID[],
  ADD COLUMN "lead_reminder_minutes" INTEGER NOT NULL DEFAULT 30;
CREATE INDEX "products_brand_id_idx" ON "products"("brand_id");
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- One lead someone must contact
CREATE TABLE "lead_follow_ups" (
  "id" UUID NOT NULL,
  "org_id" UUID NOT NULL,
  "contact_id" UUID NOT NULL,
  "product_id" UUID,
  "assignee_id" UUID NOT NULL,
  "source" VARCHAR(30) NOT NULL DEFAULT 'LEAD_AD',
  "leadgen_id" VARCHAR(100),
  "due_at" TIMESTAMP(3) NOT NULL,
  "touched_at" TIMESTAMP(3),
  "touched_by_id" UUID,
  "touched_via" VARCHAR(20),
  "reminded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "lead_follow_ups_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "lead_follow_ups_org_id_leadgen_id_product_id_key" ON "lead_follow_ups"("org_id", "leadgen_id", "product_id");
CREATE INDEX "lead_follow_ups_org_id_assignee_id_touched_at_idx" ON "lead_follow_ups"("org_id", "assignee_id", "touched_at");
CREATE INDEX "lead_follow_ups_contact_id_touched_at_idx" ON "lead_follow_ups"("contact_id", "touched_at");
CREATE INDEX "lead_follow_ups_due_at_idx" ON "lead_follow_ups"("due_at");
ALTER TABLE "lead_follow_ups" ADD CONSTRAINT "lead_follow_ups_contact_id_fkey"
  FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lead_follow_ups" ADD CONSTRAINT "lead_follow_ups_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
