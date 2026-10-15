-- What a freelancer does, asked in onboarding; shapes their default templates. Additive only.

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "freelancer_type" VARCHAR(30);
ALTER TABLE "organizations" ADD COLUMN "freelancer_service" VARCHAR(120);
