-- AlterEnum: add WIDGET_CONFIG_UPDATED to AuditAction (was missing from earlier migration)
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'WIDGET_CONFIG_UPDATED';

-- AlterTable: add AI assistant fields to widget_configs
-- ALTER TABLE "widget_configs"
--   ADD COLUMN "ai_assistant_enabled" BOOLEAN NOT NULL DEFAULT false,
--   ADD COLUMN "ai_system_prompt" VARCHAR(2000);
