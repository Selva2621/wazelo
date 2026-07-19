-- Add result_count to scrape_runs
ALTER TABLE "scrape_runs" ADD COLUMN "result_count" INTEGER NOT NULL DEFAULT 0;

-- Create scrape_results table
CREATE TABLE "scrape_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scrape_run_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" VARCHAR(500),
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "company" VARCHAR(500),
    "job_title" VARCHAR(500),
    "location" VARCHAR(500),
    "address" VARCHAR(1000),
    "website" VARCHAR(500),
    "budget" VARCHAR(100),
    "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "rating" DOUBLE PRECISION,
    "review_count" INTEGER,
    "category" VARCHAR(200),
    "source_url" VARCHAR(2000) NOT NULL,
    "imported" BOOLEAN NOT NULL DEFAULT false,
    "contact_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "scrape_results_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "scrape_results_scrape_run_id_idx" ON "scrape_results"("scrape_run_id");
CREATE INDEX "scrape_results_org_id_idx" ON "scrape_results"("org_id");
CREATE INDEX "scrape_results_scrape_run_id_imported_idx" ON "scrape_results"("scrape_run_id", "imported");

-- Foreign key
ALTER TABLE "scrape_results" ADD CONSTRAINT "scrape_results_scrape_run_id_fkey"
    FOREIGN KEY ("scrape_run_id") REFERENCES "scrape_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
