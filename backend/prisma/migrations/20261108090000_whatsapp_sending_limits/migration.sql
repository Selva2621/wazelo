-- Per-number sending limits set by an admin (warm-up stage, daily caps, bulk gap).
-- Null keeps the built-in warm-up defaults, so existing numbers are unchanged.
ALTER TABLE "whatsapp_sessions" ADD COLUMN "sending_limits" JSONB;
