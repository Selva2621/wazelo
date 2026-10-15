-- Browser push moves from bare subscriptions to one row per (user, device),
-- so permission is asked once per device and pushes reach only that user's devices.
DROP TABLE IF EXISTS "push_subscriptions";

-- CreateTable
CREATE TABLE "notification_devices" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_id" VARCHAR(64) NOT NULL,
    "device_name" VARCHAR(120),
    "user_agent" VARCHAR(500),
    "permission" VARCHAR(20) NOT NULL DEFAULT 'default',
    "prompted_at" TIMESTAMP(3),
    "endpoint" TEXT,
    "p256dh" VARCHAR(255),
    "auth" VARCHAR(255),
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_devices_endpoint_key" ON "notification_devices"("endpoint");

-- CreateIndex
CREATE INDEX "notification_devices_user_id_idx" ON "notification_devices"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_devices_user_id_device_id_key" ON "notification_devices"("user_id", "device_id");
