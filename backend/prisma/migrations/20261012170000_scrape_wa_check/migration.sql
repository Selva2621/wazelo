-- AlterTable
ALTER TABLE "scrape_runs" ADD COLUMN "wa_check" JSONB;

-- AlterTable
ALTER TABLE "scrape_results" ADD COLUMN "wa_exists" BOOLEAN,
ADD COLUMN "wa_checked_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "scrape_results_org_id_phone_idx" ON "scrape_results"("org_id", "phone");
