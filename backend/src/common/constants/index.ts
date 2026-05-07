export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export const PASSWORD_REQUIREMENTS =
  'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol';

export const SAFE_AUTH_MESSAGE =
  'If an account with that email exists, you will receive an email shortly.';

export const ORG_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const MAX_SLUG_LENGTH = 100;

export const INVITATION_EXPIRY_HOURS = 48;
export const INVITATION_TOKEN_LENGTH = 32;

export const QUEUE_NAMES = {
  SEND_EMAIL: 'send-email',
  SESSION_CLEANUP: 'session-cleanup',
  SEND_INVITE_EMAIL: 'send-invite-email',
  SEND_WHATSAPP_MESSAGE: 'send-whatsapp-message',
  WHATSAPP_SESSION_HEALTH_CHECK: 'whatsapp-session-health-check',
  // EPIC 5 — Messaging Engine queues
  PROCESS_INCOMING_MESSAGE: 'process-incoming-message',
  MESSAGE_DEAD_LETTER: 'message-dead-letter',
  // EPIC 6 — Campaign Management queues
  CAMPAIGN_EXECUTE: 'campaign-execute',
  CAMPAIGN_BATCH: 'campaign-batch',
  CAMPAIGN_SCHEDULE_CHECK: 'campaign-schedule-check',
  // EPIC 7 — Scheduling & Automation queues
  SCHEDULED_MESSAGE_EXECUTE: 'scheduled-message-execute',
  SCHEDULED_MESSAGE_CHECK: 'scheduled-message-check',
  AUTOMATION_EVALUATE: 'automation-evaluate',
  AUTOMATION_EXECUTE_ACTION: 'automation-execute-action',
  FOLLOW_UP_CHECK: 'follow-up-check',
  // EPIC 9 — Subscription & Billing queues
  BILLING_PAYMENT_RETRY: 'billing-payment-retry',
  BILLING_CYCLE_CHECK: 'billing-cycle-check',
  BILLING_EXPIRY_CHECK: 'billing-expiry-check',
  BILLING_USAGE_RESET: 'billing-usage-reset',
  BILLING_DOWNGRADE_APPLY: 'billing-downgrade-apply',
  BILLING_INVOICE_GENERATE: 'billing-invoice-generate',
  // EPIC 10 — Observability queues
  AUDIT_LOG_FLUSH: 'audit-log-flush',
  METRIC_FLUSH: 'metric-flush',
  ALERT_EVALUATE: 'alert-evaluate',
  ALERT_DISPATCH: 'alert-dispatch',
  METRIC_CLEANUP: 'metric-cleanup',
  // EPIC 11 — Notification queues
  SEND_NOTIFICATION_EMAIL: 'send-notification-email',
  NOTIFICATION_DIGEST: 'notification-digest',
  // EPIC 12 — Settings & Configuration queues
  WEBHOOK_DELIVER: 'webhook-deliver',
  WEBHOOK_RETRY: 'webhook-retry',
  INTEGRATION_TEST: 'integration-test',
  CONFIG_CACHE_INVALIDATE: 'config-cache-invalidate',
  // EPIC 13 — Analytics & Reporting queues
  ANALYTICS_DAILY_AGGREGATE: 'analytics-daily-aggregate',
  ANALYTICS_HOURLY_AGGREGATE: 'analytics-hourly-aggregate',
  ANALYTICS_CLEANUP: 'analytics-cleanup',
  // EPIC 15 — SLA Tracking queues
  SLA_EVALUATE: 'sla-evaluate',
  SLA_BREACH_CHECK: 'sla-breach-check',
  SLA_ESCALATION: 'sla-escalation',
  // Social Ads Lead Integration queues
  PROCESS_LEAD_AD: 'process-lead-ad',
  FETCH_LEAD_AD_DATA: 'fetch-lead-ad-data',
  // EPIC 16 — Multi-Channel Integration queues
  SEND_CHANNEL_MESSAGE: 'send-channel-message',
  PROCESS_CHANNEL_INBOUND: 'process-channel-inbound',
  CHANNEL_MESSAGE_DEAD_LETTER: 'channel-message-dead-letter',
  CHANNEL_VERIFY: 'channel-verify',
  CHANNEL_HEALTH_CHECK: 'channel-health-check',
  EMAIL_IMAP_POLL: 'email-imap-poll',
  // Drip Sequence queues
  SEQUENCE_STEP_CHECK: 'sequence-step-check',
  SEQUENCE_SEND_STEP: 'sequence-send-step',
  // Developer API queues
  DEVELOPER_WEBHOOK_DELIVER: 'developer-webhook-deliver',
  // Shopify integration queues
  PROCESS_SHOPIFY_WEBHOOK: 'process-shopify-webhook',
} as const;

export const EVENT_NAMES = {
  // Auth events
  USER_REGISTERED: 'user.registered',
  EMAIL_VERIFIED: 'user.email_verified',
  LOGIN_SUCCESS: 'auth.login_success',
  LOGIN_FAILED: 'auth.login_failed',
  ACCOUNT_LOCKED: 'auth.account_locked',
  PASSWORD_RESET_REQUESTED: 'auth.password_reset_requested',
  PASSWORD_RESET_COMPLETED: 'auth.password_reset_completed',
  LOGOUT: 'auth.logout',
  SESSION_REVOKED: 'auth.session_revoked',

  // Org/User management events (EPIC 2)
  USER_INVITED: 'org.user_invited',
  INVITATION_ACCEPTED: 'org.invitation_accepted',
  USER_CREATED: 'org.user_created',
  USER_DISABLED: 'org.user_disabled',
  USER_ENABLED: 'org.user_enabled',
  USER_DELETED: 'org.user_deleted',
  ROLE_CHANGED: 'org.role_changed',
  ORG_SETTINGS_UPDATED: 'org.settings_updated',

  // WhatsApp session events (EPIC 3)
  WHATSAPP_QR_GENERATED: 'whatsapp.qr_generated',
  WHATSAPP_SESSION_CONNECTED: 'whatsapp.session_connected',
  WHATSAPP_SESSION_DISCONNECTED: 'whatsapp.session_disconnected',
  WHATSAPP_SESSION_RECONNECTING: 'whatsapp.session_reconnecting',
  WHATSAPP_SESSION_FORCE_DISCONNECTED: 'whatsapp.session_force_disconnected',

  // WhatsApp message events (EPIC 3)
  WHATSAPP_MESSAGE_RECEIVED: 'whatsapp.message_received',
  WHATSAPP_MESSAGE_SENT: 'whatsapp.message_sent',
  WHATSAPP_MESSAGE_DELIVERED: 'whatsapp.message_delivered',
  WHATSAPP_MESSAGE_READ: 'whatsapp.message_read',
  WHATSAPP_MESSAGE_FAILED: 'whatsapp.message_failed',
  WHATSAPP_STATUS_UPDATE: 'whatsapp.status_update',

  // Baileys internal events (bridge layer)
  BAILEYS_CONNECTION_UPDATE: 'baileys.connection_update',
  BAILEYS_MESSAGE_UPSERT: 'baileys.message_upsert',
  BAILEYS_MESSAGE_UPDATE: 'baileys.message_update',

  // Contact & Lead Management events (EPIC 4)
  CONTACT_CREATED: 'contact.created',
  CONTACT_AUTO_CREATED: 'contact.auto_created',
  CONTACT_UPDATED: 'contact.updated',
  CONTACT_DELETED: 'contact.deleted',
  CONTACT_MERGED: 'contact.merged',
  CONTACT_ASSIGNED: 'contact.assigned',
  CONTACT_REASSIGNED: 'contact.reassigned',
  CONTACT_STATUS_CHANGED: 'contact.status_changed',
  CONTACT_NOTE_ADDED: 'contact.note_added',
  CONTACT_TAG_ADDED: 'contact.tag_added',
  CONTACT_TAG_REMOVED: 'contact.tag_removed',

  // Messaging Engine events (EPIC 5)
  MESSAGE_QUEUED: 'message.queued',
  MESSAGE_PROCESSING: 'message.processing',
  MESSAGE_DEAD_LETTERED: 'message.dead_lettered',
  MESSAGE_REPROCESSED: 'message.reprocessed',
  CONVERSATION_CREATED: 'conversation.created',
  CONVERSATION_UPDATED: 'conversation.updated',
  CONVERSATION_CLOSED: 'conversation.closed',
  CONVERSATION_ASSIGNED: 'conversation.assigned',
  RATE_LIMIT_EXCEEDED: 'message.rate_limit_exceeded',

  // Campaign Management events (EPIC 6)
  CAMPAIGN_CREATED: 'campaign.created',
  CAMPAIGN_UPDATED: 'campaign.updated',
  CAMPAIGN_SCHEDULED: 'campaign.scheduled',
  CAMPAIGN_STARTED: 'campaign.started',
  CAMPAIGN_PAUSED: 'campaign.paused',
  CAMPAIGN_RESUMED: 'campaign.resumed',
  CAMPAIGN_COMPLETED: 'campaign.completed',
  CAMPAIGN_FAILED: 'campaign.failed',
  CAMPAIGN_CANCELLED: 'campaign.cancelled',
  CAMPAIGN_PROGRESS: 'campaign.progress',

  // Scheduling & Automation events (EPIC 7)
  SCHEDULED_MESSAGE_CREATED: 'scheduled_message.created',
  SCHEDULED_MESSAGE_UPDATED: 'scheduled_message.updated',
  SCHEDULED_MESSAGE_CANCELLED: 'scheduled_message.cancelled',
  SCHEDULED_MESSAGE_EXECUTED: 'scheduled_message.executed',
  SCHEDULED_MESSAGE_FAILED: 'scheduled_message.failed',
  AUTOMATION_RULE_CREATED: 'automation.rule_created',
  AUTOMATION_RULE_UPDATED: 'automation.rule_updated',
  AUTOMATION_RULE_ENABLED: 'automation.rule_enabled',
  AUTOMATION_RULE_DISABLED: 'automation.rule_disabled',
  AUTOMATION_RULE_DELETED: 'automation.rule_deleted',
  AUTOMATION_TRIGGERED: 'automation.triggered',
  AUTOMATION_EXECUTED: 'automation.executed',
  AUTOMATION_FAILED: 'automation.failed',
  FOLLOW_UP_SCHEDULED: 'follow_up.scheduled',
  FOLLOW_UP_CANCELLED: 'follow_up.cancelled',
  FOLLOW_UP_EXECUTED: 'follow_up.executed',

  // Subscription & Billing events (EPIC 9)
  SUBSCRIPTION_CREATED: 'billing.subscription_created',
  SUBSCRIPTION_UPGRADED: 'billing.subscription_upgraded',
  SUBSCRIPTION_DOWNGRADE_SCHEDULED: 'billing.subscription_downgrade_scheduled',
  SUBSCRIPTION_DOWNGRADE_APPLIED: 'billing.subscription_downgrade_applied',
  SUBSCRIPTION_CANCELLED: 'billing.subscription_cancelled',
  SUBSCRIPTION_RENEWED: 'billing.subscription_renewed',
  SUBSCRIPTION_EXPIRED: 'billing.subscription_expired',
  SUBSCRIPTION_GRACE_PERIOD: 'billing.subscription_grace_period',
  SUBSCRIPTION_REACTIVATED: 'billing.subscription_reactivated',
  PAYMENT_SUCCEEDED: 'billing.payment_succeeded',
  PAYMENT_FAILED: 'billing.payment_failed',
  PAYMENT_RETRY_SCHEDULED: 'billing.payment_retry_scheduled',
  INVOICE_GENERATED: 'billing.invoice_generated',
  USAGE_LIMIT_REACHED: 'billing.usage_limit_reached',
  USAGE_SOFT_LIMIT_WARNING: 'billing.usage_soft_limit_warning',
  USAGE_COUNTER_RESET: 'billing.usage_counter_reset',
  PLAN_CREATED: 'billing.plan_created',
  PLAN_UPDATED: 'billing.plan_updated',

  // RBAC & Access Control events (EPIC 8)
  PERMISSION_DENIED: 'rbac.permission_denied',
  CROSS_TENANT_ACCESS_BLOCKED: 'rbac.cross_tenant_blocked',
  ROLE_PERMISSION_UPDATED: 'rbac.role_permission_updated',

  // Observability events (EPIC 10)
  METRIC_RECORDED: 'observability.metric_recorded',
  ALERT_TRIGGERED: 'observability.alert_triggered',
  ALERT_RESOLVED: 'observability.alert_resolved',
  ERROR_TRACKED: 'observability.error_tracked',
  HEALTH_CHECK_FAILED: 'observability.health_check_failed',

  // Notification events (EPIC 11)
  NOTIFICATION_CREATED: 'notification.created',
  NOTIFICATION_READ: 'notification.read',
  NOTIFICATION_ALL_READ: 'notification.all_read',
  NOTIFICATION_DELETED: 'notification.deleted',
  NOTIFICATION_PREFERENCES_UPDATED: 'notification.preferences_updated',

  // Settings & Configuration events (EPIC 12)
  SETTING_UPDATED: 'settings.setting_updated',
  SETTING_DELETED: 'settings.setting_deleted',
  FEATURE_FLAG_CREATED: 'settings.feature_flag_created',
  FEATURE_FLAG_UPDATED: 'settings.feature_flag_updated',
  FEATURE_FLAG_DELETED: 'settings.feature_flag_deleted',
  INTEGRATION_CONFIG_CREATED: 'settings.integration_created',
  INTEGRATION_CONFIG_UPDATED: 'settings.integration_updated',
  INTEGRATION_CONFIG_DELETED: 'settings.integration_deleted',
  INTEGRATION_CONFIG_TESTED: 'settings.integration_tested',
  WEBHOOK_CREATED: 'settings.webhook_created',
  WEBHOOK_UPDATED: 'settings.webhook_updated',
  WEBHOOK_DELETED: 'settings.webhook_deleted',
  WEBHOOK_DELIVERED: 'settings.webhook_delivered',
  WEBHOOK_DELIVERY_FAILED: 'settings.webhook_delivery_failed',

  // Analytics & Reporting events (EPIC 13)
  ANALYTICS_DAILY_AGGREGATED: 'analytics.daily_aggregated',
  ANALYTICS_HOURLY_AGGREGATED: 'analytics.hourly_aggregated',
  ANALYTICS_BACKFILL_COMPLETED: 'analytics.backfill_completed',

  // Social Ads Lead Integration events
  LEAD_AD_RECEIVED: 'lead_ad.received',
  LEAD_AD_PROCESSED: 'lead_ad.processed',
  LEAD_AD_FAILED: 'lead_ad.failed',

  // Multi-Channel Integration events (EPIC 16)
  CHANNEL_CREATED: 'channel.created',
  CHANNEL_UPDATED: 'channel.updated',
  CHANNEL_VERIFIED: 'channel.verified',
  CHANNEL_SUSPENDED: 'channel.suspended',
  CHANNEL_REACTIVATED: 'channel.reactivated',
  CHANNEL_DISCONNECTED: 'channel.disconnected',
  CHANNEL_DELETED: 'channel.deleted',
  CHANNEL_ERROR: 'channel.error',
  CHANNEL_MESSAGE_SENT: 'channel.message_sent',
  CHANNEL_MESSAGE_RECEIVED: 'channel.message_received',
  CHANNEL_MESSAGE_DELIVERED: 'channel.message_delivered',
  CHANNEL_MESSAGE_READ: 'channel.message_read',
  CHANNEL_MESSAGE_FAILED: 'channel.message_failed',

  // Chatbot events
  CHATBOT_FLOW_TRIGGERED: 'chatbot.flow_triggered',
  CHATBOT_AI_REPLY_SENT: 'chatbot.ai_reply_sent',
  CHATBOT_SESSION_COMPLETED: 'chatbot.session_completed',
  CHATBOT_SESSION_HANDED_OFF: 'chatbot.session_handed_off',

  // Developer API events
  DEVELOPER_MESSAGE_SENT: 'developer.message_sent',
  DEVELOPER_WEBHOOK_TRIGGERED: 'developer.webhook_triggered',

  // Chat Widget events (Phase 4)
  WIDGET_CONFIG_UPDATED: 'widget.config_updated',
  WIDGET_MESSAGE_RECEIVED: 'widget.message_received',

  // Deal events
  DEAL_AUTO_CREATED: 'deals.auto_created',
  PURCHASE_INTENT_DETECTED: 'ai.purchase_intent_detected',

  // Product events
  CONTACT_PRODUCT_ASSIGNED: 'product.contact_assigned',
  CONTACT_PRODUCT_REMOVED: 'product.contact_removed',
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',

  // Knowledge Base events
  KB_ARTICLE_PUBLISHED: 'kb.article.published',
  KB_ARTICLE_DELETED: 'kb.article.deleted',

  // Shopify events
  SHOPIFY_ORDER_CREATED: 'shopify.order_created',
  SHOPIFY_ORDER_FULFILLED: 'shopify.order_fulfilled',
  SHOPIFY_CART_ABANDONED: 'shopify.cart_abandoned',

  // SLA Tracking events (EPIC 15)
  SLA_POLICY_CREATED: 'sla.policy_created',
  SLA_POLICY_UPDATED: 'sla.policy_updated',
  SLA_POLICY_DELETED: 'sla.policy_deleted',
  SLA_TRACKING_STARTED: 'sla.tracking_started',
  SLA_WARNING_TRIGGERED: 'sla.warning_triggered',
  SLA_BREACH_DETECTED: 'sla.breach_detected',
  SLA_BREACH_ACKNOWLEDGED: 'sla.breach_acknowledged',
  SLA_BREACH_RESOLVED: 'sla.breach_resolved',
  SLA_ESCALATION_TRIGGERED: 'sla.escalation_triggered',
} as const;

export const WHATSAPP_CONFIG = {
  QR_REFRESH_INTERVAL_MS: 25_000,
  HEARTBEAT_INTERVAL_MS: 30_000,
  DISCONNECT_DETECTION_TIMEOUT_MS: 120_000, // 2 min — phone must miss 4 heartbeats before stale
  MAX_RECONNECT_ATTEMPTS: 15,               // ~46h total window with exponential backoff
  RECONNECT_DELAY_MS: 5_000,
  MAX_MESSAGE_RETRY_COUNT: 3,
  MESSAGE_RETRY_DELAY_SECONDS: 5,
  SESSION_ENCRYPTION_ALGORITHM: 'aes-256-gcm',
} as const;

export const CAMPAIGN_CONFIG = {
  /** Number of recipients per batch job */
  BATCH_SIZE: 50,
  /** Delay in seconds between batch dispatches to avoid rate limit spikes */
  BATCH_DELAY_SECONDS: 2,
  /** Concurrent campaign batch workers */
  WORKER_CONCURRENCY: 3,
  /** Maximum recipients per campaign */
  MAX_RECIPIENTS: 100_000,
  /** Campaign messages get lower priority than direct messages */
  CAMPAIGN_MESSAGE_PRIORITY: -1,
  /** How often the scheduler checks for due campaigns (seconds) */
  SCHEDULE_CHECK_INTERVAL_SECONDS: 30,
} as const;

export const AUTOMATION_CONFIG = {
  /** Max automation rules per organization */
  MAX_RULES_PER_ORG: 100,
  /** Max actions per automation rule */
  MAX_ACTIONS_PER_RULE: 10,
  /** Max concurrent automation evaluations per org */
  WORKER_CONCURRENCY: 5,
  /** Max execution time for a single automation (ms) */
  EXECUTION_TIMEOUT_MS: 30_000,
  /** Cooldown between same trigger on same contact (seconds) */
  DEFAULT_COOLDOWN_SECONDS: 60,
  /** Max loop depth — if an automation action triggers another automation */
  MAX_LOOP_DEPTH: 3,
  /** Max executions per contact per rule (0 = unlimited) */
  DEFAULT_MAX_EXECUTIONS_PER_CONTACT: 0,
  /** How often the follow-up checker runs (seconds) */
  FOLLOW_UP_CHECK_INTERVAL_SECONDS: 60,
  /** Execution log retention days */
  LOG_RETENTION_DAYS: 90,
} as const;

export const SCHEDULER_CONFIG = {
  /** How often the scheduler checks for pending scheduled messages (seconds) */
  CHECK_INTERVAL_SECONDS: 15,
  /** Time accuracy tolerance (seconds) — AC1: ±2s */
  TIME_ACCURACY_SECONDS: 2,
  /** Max retries for failed scheduled messages */
  MAX_RETRIES: 3,
  /** Retry delay base (seconds) for exponential backoff */
  RETRY_BASE_DELAY_SECONDS: 10,
  /** Max scheduled messages per user */
  MAX_SCHEDULED_PER_USER: 500,
} as const;

export const MESSAGING_CONFIG = {
  /** Max retries before dead-lettering */
  MAX_RETRY_COUNT: 3,
  /** Base delay in seconds for exponential backoff (delay = base * 2^attempt) */
  RETRY_BASE_DELAY_SECONDS: 5,
  /** Maximum backoff delay cap in seconds */
  RETRY_MAX_DELAY_SECONDS: 300,
  /** Per-session messages per minute */
  RATE_LIMIT_PER_SESSION_PER_MINUTE: 30,
  /** Global org-level messages per minute */
  RATE_LIMIT_PER_ORG_PER_MINUTE: 200,
  /** Max burst allowed above sustained rate */
  RATE_LIMIT_BURST_MULTIPLIER: 2,
  /** How long a message can stay in PROCESSING before considered stale (ms) */
  PROCESSING_STALE_THRESHOLD_MS: 120_000,
  /** How long a message can stay in QUEUED before recovery picks it up (ms) */
  QUEUED_STALE_THRESHOLD_MS: 300_000,
  /** Worker concurrency (jobs processed in parallel) */
  WORKER_CONCURRENCY: 5,
  /** Incoming message processing timeout (ms) */
  INCOMING_PROCESS_TIMEOUT_MS: 30_000,
} as const;

export const BILLING_CONFIG = {
  /** How often the cycle checker runs (seconds) */
  CYCLE_CHECK_INTERVAL_SECONDS: 300,
  /** How often the expiry checker runs (seconds) */
  EXPIRY_CHECK_INTERVAL_SECONDS: 300,
  /** Default grace period days if not set on plan */
  DEFAULT_GRACE_PERIOD_DAYS: 3,
  /** Max payment retry attempts */
  MAX_PAYMENT_RETRIES: 3,
  /** Base delay for payment retry exponential backoff (seconds) */
  PAYMENT_RETRY_BASE_DELAY_SECONDS: 3600, // 1 hour
  /** Invoice number prefix */
  INVOICE_NUMBER_PREFIX: 'INV',
  /** Default trial days for plans that support trials */
  DEFAULT_TRIAL_DAYS: 14,
  /** How often the downgrade applicator runs (seconds) */
  DOWNGRADE_CHECK_INTERVAL_SECONDS: 300,
  /** Proration calculation precision */
  PRORATION_ROUND_UP: true,
} as const;

export const NOTIFICATION_CONFIG = {
  /** Cooldown in seconds between same notification type for same user */
  COOLDOWN_SECONDS: 30,
  /** Max notifications per user before oldest get auto-deleted */
  MAX_NOTIFICATIONS_PER_USER: 500,
  /** Default page size for notification list */
  DEFAULT_PAGE_SIZE: 20,
  /** Max page size for notification list */
  MAX_PAGE_SIZE: 100,
  /** Email worker concurrency */
  EMAIL_WORKER_CONCURRENCY: 3,
  /** Notification retention days (auto-cleanup) */
  RETENTION_DAYS: 90,
  /** Max batch size for mark-all-as-read */
  MARK_ALL_READ_BATCH_SIZE: 500,
} as const;

export const SETTINGS_CONFIG = {
  /** In-memory config cache TTL (seconds) */
  CACHE_TTL_SECONDS: 300,
  /** Max settings per org */
  MAX_SETTINGS_PER_ORG: 500,
  /** Max feature flags per org */
  MAX_FEATURE_FLAGS_PER_ORG: 100,
  /** Max integrations per org */
  MAX_INTEGRATIONS_PER_ORG: 20,
  /** Max webhooks per org */
  MAX_WEBHOOKS_PER_ORG: 25,
  /** Max webhook delivery retries */
  WEBHOOK_MAX_RETRIES: 5,
  /** Webhook retry base delay (seconds) — exponential backoff */
  WEBHOOK_RETRY_BASE_DELAY_SECONDS: 10,
  /** Webhook delivery timeout (ms) */
  WEBHOOK_TIMEOUT_MS: 10_000,
  /** Consecutive failures before auto-disabling webhook */
  WEBHOOK_AUTO_DISABLE_THRESHOLD: 10,
  /** Webhook delivery log retention days */
  WEBHOOK_DELIVERY_RETENTION_DAYS: 30,
  /** Integration config encryption algorithm */
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  /** Default page size for webhook deliveries */
  WEBHOOK_DELIVERY_PAGE_SIZE: 20,
  /** Max page size for webhook deliveries */
  WEBHOOK_DELIVERY_MAX_PAGE_SIZE: 100,
  /** Webhook delivery worker concurrency */
  WEBHOOK_WORKER_CONCURRENCY: 5,
} as const;

export const OBSERVABILITY_CONFIG = {
  /** Audit log buffer size before flushing to DB */
  AUDIT_BUFFER_SIZE: 50,
  /** Max time (ms) to hold audit logs in buffer before force flush */
  AUDIT_FLUSH_INTERVAL_MS: 5_000,
  /** Metric buffer size before flushing */
  METRIC_BUFFER_SIZE: 100,
  /** Max time (ms) to hold metrics in buffer before force flush */
  METRIC_FLUSH_INTERVAL_MS: 10_000,
  /** Metric retention days (older snapshots get cleaned up) */
  METRIC_RETENTION_DAYS: 30,
  /** Metric cleanup interval (every 6 hours) */
  METRIC_CLEANUP_INTERVAL_HOURS: 6,
  /** Alert evaluation interval (seconds) */
  ALERT_EVALUATION_INTERVAL_SECONDS: 60,
  /** Default alert cooldown (seconds) — prevent alert storms */
  DEFAULT_ALERT_COOLDOWN_SECONDS: 300,
  /** Max error fingerprints to track in memory */
  MAX_ERROR_FINGERPRINTS: 1000,
  /** Error grouping window (ms) — group similar errors within this window */
  ERROR_GROUPING_WINDOW_MS: 60_000,
  /** Health check interval (seconds) */
  HEALTH_CHECK_INTERVAL_SECONDS: 30,
  /** Queue depth warning threshold */
  QUEUE_DEPTH_WARNING: 1000,
  /** Queue depth critical threshold */
  QUEUE_DEPTH_CRITICAL: 5000,
  /** API latency warning threshold (ms) */
  API_LATENCY_WARNING_MS: 2000,
  /** API latency critical threshold (ms) */
  API_LATENCY_CRITICAL_MS: 5000,
} as const;

export const METRIC_NAMES = {
  API_LATENCY: 'api_latency',
  API_REQUEST_COUNT: 'api_request_count',
  API_ERROR_COUNT: 'api_error_count',
  QUEUE_DEPTH: 'queue_depth',
  QUEUE_PROCESSING_TIME: 'queue_processing_time',
  QUEUE_FAILED_JOBS: 'queue_failed_jobs',
  MESSAGE_SEND_RATE: 'message_send_rate',
  MESSAGE_DELIVERY_RATE: 'message_delivery_rate',
  ACTIVE_WEBSOCKET_CONNECTIONS: 'active_ws_connections',
  ACTIVE_WHATSAPP_SESSIONS: 'active_wa_sessions',
  DB_QUERY_TIME: 'db_query_time',
  ERROR_RATE: 'error_rate',
} as const;

export const SLA_CONFIG = {
  /** How often the SLA breach checker runs (seconds) */
  BREACH_CHECK_INTERVAL_SECONDS: 30,
  /** Worker concurrency for SLA evaluation */
  WORKER_CONCURRENCY: 3,
  /** Max SLA policies per organization */
  MAX_POLICIES_PER_ORG: 50,
  /** Breach check batch size (conversations per run) */
  BREACH_CHECK_BATCH_SIZE: 500,
  /** Minimum threshold value (ms) — 10 seconds */
  MIN_THRESHOLD_MS: 10_000,
  /** Maximum threshold value (ms) — 7 days */
  MAX_THRESHOLD_MS: 604_800_000,
  /** Escalation cooldown (seconds) — prevent escalation storms */
  ESCALATION_COOLDOWN_SECONDS: 300,
  /** SLA tracking retention days */
  TRACKING_RETENTION_DAYS: 365,
  /** Max escalation levels per policy */
  MAX_ESCALATION_LEVELS: 5,
} as const;

export const LEAD_ADS_CONFIG = {
  /** Worker concurrency for lead ad processing */
  WORKER_CONCURRENCY: 5,
  /** Max retries for failed lead processing */
  MAX_RETRY_COUNT: 3,
  /** Retry base delay (seconds) for exponential backoff */
  RETRY_BASE_DELAY_SECONDS: 10,
  /** Meta Graph API version */
  GRAPH_API_VERSION: 'v19.0',
  /** Meta Graph API base URL */
  GRAPH_API_BASE_URL: 'https://graph.facebook.com',
  /** Timeout for fetching lead data from Meta (ms) */
  LEAD_FETCH_TIMEOUT_MS: 15_000,
  /** Deduplication window (hours) */
  DEDUP_WINDOW_HOURS: 24,
} as const;

export const CHANNEL_CONFIG = {
  /** Max channels per organization */
  MAX_CHANNELS_PER_ORG: 20,
  /** Default rate limit per minute for new channels */
  DEFAULT_RATE_LIMIT_PER_MIN: 60,
  /** Worker concurrency for channel message sending */
  WORKER_CONCURRENCY: 5,
  /** Channel health check interval (seconds) */
  HEALTH_CHECK_INTERVAL_SECONDS: 300,
  /** Consecutive failures before auto-suspending channel */
  AUTO_SUSPEND_THRESHOLD: 3,
  /** Provider API timeout (ms) */
  PROVIDER_TIMEOUT_MS: 30_000,
  /** Max retries for channel messages */
  MAX_RETRY_COUNT: 3,
  /** Retry base delay (seconds) for exponential backoff */
  RETRY_BASE_DELAY_SECONDS: 5,
  /** Maximum backoff delay cap (seconds) */
  RETRY_MAX_DELAY_SECONDS: 300,
  /** Rate limit window cleanup interval (hours) */
  RATE_LIMIT_CLEANUP_INTERVAL_HOURS: 1,
  /** Channel config encryption algorithm */
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
} as const;

export const DEVELOPER_API_CONFIG = {
  /** Default rate limit per minute for developer API */
  RATE_LIMIT_PER_MINUTE: 60,
  /** Max webhooks per developer org */
  MAX_WEBHOOKS_PER_ORG: 10,
  /** Default page size for API responses */
  DEFAULT_PAGE_SIZE: 20,
  /** Max page size for API responses */
  MAX_PAGE_SIZE: 100,
  /** Webhook events that developers can subscribe to */
  AVAILABLE_WEBHOOK_EVENTS: [
    'message.received',
    'message.status',
    'message.sent',
    'message.delivered',
    'message.read',
    'message.failed',
  ],
} as const;

export const ANALYTICS_CONFIG = {
  /** How many days of data to retain in analytics tables */
  RETENTION_DAYS: 365,
  /** Hourly aggregation runs 5 minutes after each hour */
  HOURLY_CRON: '5 * * * *',
  /** Daily aggregation runs at 00:15 UTC */
  DAILY_CRON: '15 0 * * *',
  /** Cleanup runs once daily at 03:00 UTC */
  CLEANUP_CRON: '0 3 * * *',
  /** Max date range allowed for custom queries (days) */
  MAX_QUERY_RANGE_DAYS: 90,
  /** Backfill batch size (days per job) */
  BACKFILL_BATCH_DAYS: 7,
} as const;
