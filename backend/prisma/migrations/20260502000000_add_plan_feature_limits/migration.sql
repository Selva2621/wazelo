-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "ai_credits_per_month" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ai_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "max_api_calls_per_month" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "max_message_templates" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "max_shopify_stores" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shopify_enabled" BOOLEAN NOT NULL DEFAULT false;

