-- "Is this number on WhatsApp?" answer per contact (null = not checked / lookup failed).
-- WhatsApp campaigns skip contacts known not to be on WhatsApp.
ALTER TABLE "contacts" ADD COLUMN "wa_exists" BOOLEAN;
ALTER TABLE "contacts" ADD COLUMN "wa_checked_at" TIMESTAMP(3);

-- Background number check of a saved group (state, token, timestamps)
ALTER TABLE "saved_contact_groups" ADD COLUMN "wa_check" JSONB;
