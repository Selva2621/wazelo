-- AlterTable
ALTER TABLE "scrape_runs" ADD COLUMN "filters" JSONB;

-- AlterTable
ALTER TABLE "scrape_results" ADD COLUMN "score" INTEGER,
ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
