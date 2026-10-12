-- A freelancer can do more than one kind of work: freelancer_type -> freelancer_types[].
-- Existing single values are carried over before the old column is dropped.

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "freelancer_types" VARCHAR(30)[] NOT NULL DEFAULT ARRAY[]::VARCHAR(30)[];

UPDATE "organizations" SET "freelancer_types" = ARRAY["freelancer_type"] WHERE "freelancer_type" IS NOT NULL;

ALTER TABLE "organizations" DROP COLUMN "freelancer_type";
