-- Contacts from the website chat widget get their own source (additive only)

-- AlterEnum
ALTER TYPE "ContactSource" ADD VALUE 'WEBSITE';
