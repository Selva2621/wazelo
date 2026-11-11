-- Meta-approved templates synced from an official WhatsApp number's business account
ALTER TABLE "message_templates" ADD COLUMN "cloud_session_id" UUID;
CREATE INDEX "message_templates_cloud_session_id_idx" ON "message_templates"("cloud_session_id");
