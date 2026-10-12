-- CreateTable
CREATE TABLE "api_request_logs" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "api_key_id" UUID NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "path" VARCHAR(255) NOT NULL,
    "status_code" INTEGER NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "ip_address" VARCHAR(45),
    "error_message" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_request_logs_org_id_created_at_idx" ON "api_request_logs"("org_id", "created_at" DESC);
