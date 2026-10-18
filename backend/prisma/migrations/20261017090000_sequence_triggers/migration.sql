-- Always-on sequences: contacts join one at a time when a deal moves stage,
-- a lead status changes or a contact is created.
CREATE TYPE "SequenceTriggerType" AS ENUM ('DEAL_STAGE_CHANGED', 'LEAD_STATUS_CHANGED', 'CONTACT_CREATED');

ALTER TABLE "campaign_sequences" ADD COLUMN "trigger_type" "SequenceTriggerType";
ALTER TABLE "campaign_sequences" ADD COLUMN "trigger_config" JSONB;

-- Automation: "deal moved to stage" trigger and "add to sequence" action
ALTER TYPE "AutomationTriggerType" ADD VALUE 'DEAL_STAGE_CHANGED';
ALTER TYPE "AutomationActionType" ADD VALUE 'ENROLL_IN_SEQUENCE';
