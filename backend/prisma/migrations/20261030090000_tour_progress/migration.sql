-- Product tours finished or skipped, per user and device (additive only)
CREATE TABLE "tour_progress" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_id" VARCHAR(64) NOT NULL,
    "tour_id" VARCHAR(64) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tour_progress_user_id_device_id_tour_id_key" ON "tour_progress"("user_id", "device_id", "tour_id");
CREATE INDEX "tour_progress_user_id_device_id_idx" ON "tour_progress"("user_id", "device_id");
