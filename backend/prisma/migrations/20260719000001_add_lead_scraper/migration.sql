-- Migration: Add Lead Scraper (self-hosted Apify-style scraping for freelancers)

-- Add WEB_SCRAPE to ContactSource enum
ALTER TYPE "ContactSource" ADD VALUE IF NOT EXISTS 'WEB_SCRAPE';

-- Add new enums
CREATE TYPE "ScrapeRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "ScrapeSource" AS ENUM ('GOOGLE_MAPS', 'UPWORK_JOBS', 'FREELANCER_IN', 'TRUELANCER', 'LINKEDIN_JOBS');

-- Create scrape_runs table
CREATE TABLE "scrape_runs" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "org_id"         UUID NOT NULL,
  "source"         "ScrapeSource" NOT NULL,
  "keywords"       VARCHAR(500) NOT NULL,
  "location"       VARCHAR(255),
  "max_results"    INTEGER NOT NULL DEFAULT 50,
  "status"         "ScrapeRunStatus" NOT NULL DEFAULT 'PENDING',
  "imported_count" INTEGER NOT NULL DEFAULT 0,
  "skipped_count"  INTEGER NOT NULL DEFAULT 0,
  "error_message"  TEXT,
  "completed_at"   TIMESTAMP(3),
  "created_by_id"  UUID NOT NULL,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "scrape_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "scrape_runs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "scrape_runs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "scrape_runs_org_id_idx" ON "scrape_runs"("org_id");
CREATE INDEX "scrape_runs_org_id_status_idx" ON "scrape_runs"("org_id", "status");
CREATE INDEX "scrape_runs_org_id_created_at_idx" ON "scrape_runs"("org_id", "created_at");
