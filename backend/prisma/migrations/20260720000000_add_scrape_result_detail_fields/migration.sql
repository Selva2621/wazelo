-- Add description, opening_hours, social_links to scrape_results
ALTER TABLE "scrape_results" ADD COLUMN "description" VARCHAR(2000);
ALTER TABLE "scrape_results" ADD COLUMN "opening_hours" VARCHAR(500);
ALTER TABLE "scrape_results" ADD COLUMN "social_links" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
