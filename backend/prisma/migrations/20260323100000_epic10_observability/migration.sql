-- EPIC 10: Audit Logs, Monitoring & System Observability
-- Enhances audit_logs table and adds metrics + alerting infrastructure

-- Add new columns to audit_logs
ALTER TABLE "audit_logs" ADD COLUMN "trace_id" VARCHAR(64);
ALTER TABLE "audit_logs" ADD COLUMN "source" VARCHAR(50);
ALTER TABLE "audit_logs" ADD COLUMN "duration" INTEGER;

-- Add new indexes for audit_logs
CREATE INDEX "audit_logs_trace_id_idx" ON "audit_logs"("trace_id");
CREATE INDEX "audit_logs_org_id_action_created_at_idx" ON "audit_logs"("org_id", "action", "created_at");

-- System Metric Snapshots table
CREATE TABLE "system_metric_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID,
    "metric" VARCHAR(100) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "tags" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_metric_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "system_metric_snapshots_metric_created_at_idx" ON "system_metric_snapshots"("metric", "created_at");
CREATE INDEX "system_metric_snapshots_org_id_metric_created_at_idx" ON "system_metric_snapshots"("org_id", "metric", "created_at");
CREATE INDEX "system_metric_snapshots_created_at_idx" ON "system_metric_snapshots"("created_at");

-- Alert Rules table
CREATE TABLE "alert_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "metric" VARCHAR(100) NOT NULL,
    "condition" VARCHAR(20) NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "window_seconds" INTEGER NOT NULL,
    "channels" JSONB NOT NULL,
    "channel_config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cooldown_seconds" INTEGER NOT NULL DEFAULT 300,
    "last_triggered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "alert_rules_metric_enabled_idx" ON "alert_rules"("metric", "enabled");
CREATE INDEX "alert_rules_enabled_idx" ON "alert_rules"("enabled");

-- Alert Events table
CREATE TABLE "alert_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "alert_rule_id" UUID NOT NULL,
    "metric" VARCHAR(100) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "channels" JSONB NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "alert_events_alert_rule_id_idx" ON "alert_events"("alert_rule_id");
CREATE INDEX "alert_events_metric_created_at_idx" ON "alert_events"("metric", "created_at");
CREATE INDEX "alert_events_created_at_idx" ON "alert_events"("created_at");

-- Foreign key
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_alert_rule_id_fkey" FOREIGN KEY ("alert_rule_id") REFERENCES "alert_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
