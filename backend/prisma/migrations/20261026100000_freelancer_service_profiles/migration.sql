-- Freelancer lines of work saved from "Something else" in setup, shared by all orgs
CREATE TABLE "freelancer_service_profiles" (
    "id" UUID NOT NULL,
    "key" VARCHAR(30) NOT NULL,
    "label" VARCHAR(60) NOT NULL,
    "description" VARCHAR(120) NOT NULL,
    "service_label" VARCHAR(120) NOT NULL,
    "pitch" JSONB NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 1,
    "created_by_org_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "freelancer_service_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "freelancer_service_profiles_key_key" ON "freelancer_service_profiles"("key");
