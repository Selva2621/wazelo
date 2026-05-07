-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');

-- CreateEnum
CREATE TYPE "UsageMetricType" AS ENUM ('MESSAGES_SENT', 'ACTIVE_USERS', 'WHATSAPP_SESSIONS', 'CAMPAIGN_EXECUTIONS');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MESSAGE_RECEIVED', 'CONTACT_ASSIGNED', 'CONTACT_REASSIGNED', 'CAMPAIGN_COMPLETED', 'CAMPAIGN_FAILED', 'AUTOMATION_EXECUTED', 'AUTOMATION_FAILED', 'WHATSAPP_SESSION_DISCONNECTED', 'PAYMENT_FAILED', 'USAGE_LIMIT_WARNING', 'USAGE_LIMIT_REACHED', 'SUBSCRIPTION_EXPIRING', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "SettingScope" AS ENUM ('SYSTEM', 'PLAN', 'ORG');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('SMTP', 'SENDGRID', 'STRIPE', 'RAZORPAY', 'CUSTOM_WEBHOOK');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

-- CreateEnum
CREATE TYPE "WebhookEventType" AS ENUM ('MESSAGE_RECEIVED', 'MESSAGE_SENT', 'MESSAGE_DELIVERED', 'MESSAGE_FAILED', 'CONTACT_CREATED', 'CONTACT_UPDATED', 'CAMPAIGN_COMPLETED', 'CAMPAIGN_FAILED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED', 'SUBSCRIPTION_CHANGED');

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'RETRYING');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PLAN_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PLAN_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'SUBSCRIPTION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SUBSCRIPTION_UPGRADED';
ALTER TYPE "AuditAction" ADD VALUE 'SUBSCRIPTION_DOWNGRADE_SCHEDULED';
ALTER TYPE "AuditAction" ADD VALUE 'SUBSCRIPTION_DOWNGRADE_APPLIED';
ALTER TYPE "AuditAction" ADD VALUE 'SUBSCRIPTION_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'SUBSCRIPTION_RENEWED';
ALTER TYPE "AuditAction" ADD VALUE 'SUBSCRIPTION_EXPIRED';
ALTER TYPE "AuditAction" ADD VALUE 'SUBSCRIPTION_GRACE_PERIOD_ENTERED';
ALTER TYPE "AuditAction" ADD VALUE 'SUBSCRIPTION_REACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_SUCCEEDED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_RETRY_SCHEDULED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_REFUNDED';
ALTER TYPE "AuditAction" ADD VALUE 'INVOICE_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'USAGE_LIMIT_REACHED';
ALTER TYPE "AuditAction" ADD VALUE 'USAGE_SOFT_LIMIT_WARNING';
ALTER TYPE "AuditAction" ADD VALUE 'USAGE_COUNTER_RESET';
ALTER TYPE "AuditAction" ADD VALUE 'NOTIFICATION_PREFERENCE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'SETTING_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'SETTING_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'FEATURE_FLAG_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'FEATURE_FLAG_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'FEATURE_FLAG_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'INTEGRATION_CONFIG_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'INTEGRATION_CONFIG_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'INTEGRATION_CONFIG_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'INTEGRATION_CONFIG_TESTED';
ALTER TYPE "AuditAction" ADD VALUE 'WEBHOOK_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'WEBHOOK_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'WEBHOOK_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'WEBHOOK_TESTED';

-- AlterTable
-- ALTER TABLE "alert_events" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
-- ALTER TABLE "alert_rules" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
-- ALTER TABLE "system_metric_snapshots" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "billing_cycle" "BillingCycle" NOT NULL,
    "price_in_cents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "trial_days" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "max_users" INTEGER NOT NULL DEFAULT 1,
    "max_whatsapp_sessions" INTEGER NOT NULL DEFAULT 1,
    "max_messages_per_month" INTEGER NOT NULL DEFAULT 1000,
    "max_campaigns_per_month" INTEGER NOT NULL DEFAULT 0,
    "campaigns_enabled" BOOLEAN NOT NULL DEFAULT false,
    "automation_enabled" BOOLEAN NOT NULL DEFAULT false,
    "soft_limit_percent" INTEGER NOT NULL DEFAULT 80,
    "grace_period_days" INTEGER NOT NULL DEFAULT 3,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "billing_cycle" "BillingCycle" NOT NULL,
    "price_in_cents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "trial_ends_at" TIMESTAMP(3),
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "grace_ends_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" VARCHAR(500),
    "scheduled_plan_id" UUID,
    "scheduled_change_at" TIMESTAMP(3),
    "external_id" VARCHAR(255),
    "external_customer_id" VARCHAR(255),
    "idempotency_key" VARCHAR(255),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "metric_type" "UsageMetricType" NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "current_value" INTEGER NOT NULL DEFAULT 0,
    "limit_value" INTEGER NOT NULL,
    "last_increment_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "amount_in_cents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "external_id" VARCHAR(255),
    "payment_method" VARCHAR(50),
    "failed_reason" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "next_retry_at" TIMESTAMP(3),
    "idempotency_key" VARCHAR(255),
    "metadata" JSONB,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "payment_id" UUID,
    "invoice_number" VARCHAR(50) NOT NULL,
    "amount_in_cents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "line_items" JSONB NOT NULL,
    "pdf_url" VARCHAR(2048),
    "external_id" VARCHAR(255),
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_events" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "previous_status" "SubscriptionStatus",
    "new_status" "SubscriptionStatus" NOT NULL,
    "previous_plan_id" UUID,
    "new_plan_id" UUID,
    "triggered_by_id" UUID,
    "reason" VARCHAR(500),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "title" VARCHAR(255) NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "group_key" VARCHAR(255),
    "idempotency_key" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "notification_type" "NotificationType" NOT NULL,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL,
    "org_id" UUID,
    "scope" "SettingScope" NOT NULL DEFAULT 'ORG',
    "category" VARCHAR(100) NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "value" JSONB NOT NULL,
    "value_type" VARCHAR(20) NOT NULL,
    "description" VARCHAR(500),
    "is_secret" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL,
    "org_id" UUID,
    "scope" "SettingScope" NOT NULL DEFAULT 'ORG',
    "feature_key" VARCHAR(100) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "description" VARCHAR(500),
    "expires_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_configs" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "display_name" VARCHAR(255) NOT NULL,
    "credentials" TEXT NOT NULL,
    "configuration" JSONB,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'INACTIVE',
    "last_tested_at" TIMESTAMP(3),
    "last_error" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "secret" VARCHAR(255) NOT NULL,
    "description" VARCHAR(500),
    "events" JSONB NOT NULL,
    "headers" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "timeout_ms" INTEGER NOT NULL DEFAULT 10000,
    "last_delivery_at" TIMESTAMP(3),
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "disabled_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL,
    "webhook_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "http_status" INTEGER,
    "response_body" TEXT,
    "error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "next_retry_at" TIMESTAMP(3),
    "idempotency_key" VARCHAR(255),
    "duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plans_is_active_idx" ON "plans"("is_active");

-- CreateIndex
CREATE INDEX "plans_slug_idx" ON "plans"("slug");

-- CreateIndex
CREATE INDEX "plans_deleted_at_idx" ON "plans"("deleted_at");

-- CreateIndex
CREATE INDEX "plans_is_active_sort_order_idx" ON "plans"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_billing_cycle_version_key" ON "plans"("slug", "billing_cycle", "version");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_external_id_key" ON "subscriptions"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_idempotency_key_key" ON "subscriptions"("idempotency_key");

-- CreateIndex
CREATE INDEX "subscriptions_org_id_idx" ON "subscriptions"("org_id");

-- CreateIndex
CREATE INDEX "subscriptions_org_id_status_idx" ON "subscriptions"("org_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_plan_id_idx" ON "subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "subscriptions_current_period_end_idx" ON "subscriptions"("current_period_end");

-- CreateIndex
CREATE INDEX "subscriptions_trial_ends_at_idx" ON "subscriptions"("trial_ends_at");

-- CreateIndex
CREATE INDEX "subscriptions_grace_ends_at_idx" ON "subscriptions"("grace_ends_at");

-- CreateIndex
CREATE INDEX "subscriptions_scheduled_change_at_idx" ON "subscriptions"("scheduled_change_at");

-- CreateIndex
CREATE INDEX "subscriptions_external_id_idx" ON "subscriptions"("external_id");

-- CreateIndex
CREATE INDEX "usage_records_org_id_idx" ON "usage_records"("org_id");

-- CreateIndex
CREATE INDEX "usage_records_org_id_metric_type_idx" ON "usage_records"("org_id", "metric_type");

-- CreateIndex
CREATE INDEX "usage_records_org_id_period_end_idx" ON "usage_records"("org_id", "period_end");

-- CreateIndex
CREATE INDEX "usage_records_period_end_idx" ON "usage_records"("period_end");

-- CreateIndex
CREATE UNIQUE INDEX "usage_records_org_id_metric_type_period_start_key" ON "usage_records"("org_id", "metric_type", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "payments_external_id_key" ON "payments"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_org_id_idx" ON "payments"("org_id");

-- CreateIndex
CREATE INDEX "payments_subscription_id_idx" ON "payments"("subscription_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_external_id_idx" ON "payments"("external_id");

-- CreateIndex
CREATE INDEX "payments_status_next_retry_at_idx" ON "payments"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "payments_org_id_created_at_idx" ON "payments"("org_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_payment_id_key" ON "invoices"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_external_id_key" ON "invoices"("external_id");

-- CreateIndex
CREATE INDEX "invoices_org_id_idx" ON "invoices"("org_id");

-- CreateIndex
CREATE INDEX "invoices_subscription_id_idx" ON "invoices"("subscription_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_org_id_created_at_idx" ON "invoices"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");

-- CreateIndex
CREATE INDEX "subscription_events_subscription_id_idx" ON "subscription_events"("subscription_id");

-- CreateIndex
CREATE INDEX "subscription_events_subscription_id_created_at_idx" ON "subscription_events"("subscription_id", "created_at");

-- CreateIndex
CREATE INDEX "subscription_events_org_id_idx" ON "subscription_events"("org_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_org_id_user_id_created_at_idx" ON "notifications"("org_id", "user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_type_created_at_idx" ON "notifications"("user_id", "type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_group_key_idx" ON "notifications"("group_key");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_idempotency_key_key" ON "notifications"("idempotency_key");

-- CreateIndex
CREATE INDEX "notification_preferences_org_id_user_id_idx" ON "notification_preferences"("org_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_notification_type_key" ON "notification_preferences"("user_id", "notification_type");

-- CreateIndex
CREATE INDEX "settings_org_id_idx" ON "settings"("org_id");

-- CreateIndex
CREATE INDEX "settings_scope_idx" ON "settings"("scope");

-- CreateIndex
CREATE INDEX "settings_category_idx" ON "settings"("category");

-- CreateIndex
CREATE INDEX "settings_org_id_category_idx" ON "settings"("org_id", "category");

-- CreateIndex
CREATE INDEX "settings_scope_category_key_idx" ON "settings"("scope", "category", "key");

-- CreateIndex
CREATE INDEX "settings_deleted_at_idx" ON "settings"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "settings_org_id_scope_category_key_key" ON "settings"("org_id", "scope", "category", "key");

-- CreateIndex
CREATE INDEX "feature_flags_org_id_idx" ON "feature_flags"("org_id");

-- CreateIndex
CREATE INDEX "feature_flags_scope_idx" ON "feature_flags"("scope");

-- CreateIndex
CREATE INDEX "feature_flags_feature_key_idx" ON "feature_flags"("feature_key");

-- CreateIndex
CREATE INDEX "feature_flags_org_id_feature_key_idx" ON "feature_flags"("org_id", "feature_key");

-- CreateIndex
CREATE INDEX "feature_flags_scope_feature_key_idx" ON "feature_flags"("scope", "feature_key");

-- CreateIndex
CREATE INDEX "feature_flags_enabled_idx" ON "feature_flags"("enabled");

-- CreateIndex
CREATE INDEX "feature_flags_expires_at_idx" ON "feature_flags"("expires_at");

-- CreateIndex
CREATE INDEX "feature_flags_deleted_at_idx" ON "feature_flags"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_org_id_scope_feature_key_key" ON "feature_flags"("org_id", "scope", "feature_key");

-- CreateIndex
CREATE INDEX "integration_configs_org_id_idx" ON "integration_configs"("org_id");

-- CreateIndex
CREATE INDEX "integration_configs_org_id_status_idx" ON "integration_configs"("org_id", "status");

-- CreateIndex
CREATE INDEX "integration_configs_provider_idx" ON "integration_configs"("provider");

-- CreateIndex
CREATE INDEX "integration_configs_status_idx" ON "integration_configs"("status");

-- CreateIndex
CREATE INDEX "integration_configs_deleted_at_idx" ON "integration_configs"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "integration_configs_org_id_provider_key" ON "integration_configs"("org_id", "provider");

-- CreateIndex
CREATE INDEX "webhooks_org_id_idx" ON "webhooks"("org_id");

-- CreateIndex
CREATE INDEX "webhooks_org_id_enabled_idx" ON "webhooks"("org_id", "enabled");

-- CreateIndex
CREATE INDEX "webhooks_enabled_idx" ON "webhooks"("enabled");

-- CreateIndex
CREATE INDEX "webhooks_deleted_at_idx" ON "webhooks"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_deliveries_idempotency_key_key" ON "webhook_deliveries"("idempotency_key");

-- CreateIndex
CREATE INDEX "webhook_deliveries_webhook_id_idx" ON "webhook_deliveries"("webhook_id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_webhook_id_created_at_idx" ON "webhook_deliveries"("webhook_id", "created_at");

-- CreateIndex
CREATE INDEX "webhook_deliveries_org_id_idx" ON "webhook_deliveries"("org_id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_status_idx" ON "webhook_deliveries"("status");

-- CreateIndex
CREATE INDEX "webhook_deliveries_status_next_retry_at_idx" ON "webhook_deliveries"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "webhook_deliveries_event_type_idx" ON "webhook_deliveries"("event_type");

-- CreateIndex
CREATE INDEX "webhook_deliveries_created_at_idx" ON "webhook_deliveries"("created_at");

-- CreateIndex
CREATE INDEX "webhook_deliveries_org_id_created_at_idx" ON "webhook_deliveries"("org_id", "created_at");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_configs" ADD CONSTRAINT "integration_configs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "webhooks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
