-- Automation actions: stop a sequence, assign the chat to a person (additive only)

-- AlterEnum
ALTER TYPE "AutomationActionType" ADD VALUE 'STOP_SEQUENCE';
ALTER TYPE "AutomationActionType" ADD VALUE 'ASSIGN_CONVERSATION';
