-- Day-end lead summary for each brand's manager
ALTER TABLE "brands" ADD COLUMN "last_summary_date" VARCHAR(10);
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LEAD_DAILY_SUMMARY';
