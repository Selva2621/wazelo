-- Automation action: link the contact to a product (e.g. per Meta lead form)
ALTER TYPE "AutomationActionType" ADD VALUE IF NOT EXISTS 'ADD_TO_PRODUCT';
