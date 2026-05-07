// ─── Organization Settings ───

export interface OrgSettings {
  id: string;
  orgId: string;
  name: string;
  logo?: string;
  timezone: string;
  language: string;
  industry?: string;
  description?: string;
  website?: string;
  brandColors?: {
    primary?: string;
    secondary?: string;
  };
  updatedAt: string;
}

export interface UpdateOrgSettingsRequest {
  name?: string;
  logo?: string;
  timezone?: string;
  language?: string;
  industry?: string;
  description?: string;
  website?: string;
  brandColors?: {
    primary?: string;
    secondary?: string;
  };
}

// ─── AI Memory ───

export interface OrgAiMemory {
  context: string;
  customContext: string | null;
  shopifyStore: string | null;
  documentName: string | null;
  builtAt: string | null;
  updatedAt: string;
}

// ─── WhatsApp Configuration ───

export interface WhatsAppConfig {
  messageDelay: number;
  retryLimit: number;
  autoReconnect: boolean;
  sessionTimeout: number;
}

export interface UpdateWhatsAppConfigRequest {
  messageDelay?: number;
  retryLimit?: number;
  autoReconnect?: boolean;
  sessionTimeout?: number;
}

// ─── Working Hours ───

export interface WorkingHoursConfig {
  enabled: boolean;
  startHour: string;
  endHour: string;
  workDays: boolean[];
  autoReplyEnabled: boolean;
  autoReplyMessage: string;
}

// ─── Feature Flags ───

export interface FeatureFlags {
  campaigns: boolean;
  automation: boolean;
  analytics: boolean;
  scheduler: boolean;
  billing: boolean;
}

export interface UpdateFeatureFlagsRequest {
  campaigns?: boolean;
  automation?: boolean;
  analytics?: boolean;
  scheduler?: boolean;
  billing?: boolean;
}

// ─── Notification Preferences ───
// Managed via the notifications module (per-type granular preferences)
// See: @/lib/types/notifications.ts — NotificationPreference, UpdateNotificationPreferenceRequest
// API endpoints: GET/PATCH /notifications/preferences

// ─── Integration Configurations (EPIC 12) ───

export type IntegrationProvider = 'SMTP' | 'SENDGRID' | 'STRIPE' | 'RAZORPAY' | 'SHOPIFY';
export type IntegrationStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR';

export interface IntegrationConfig {
  id: string;
  orgId: string;
  provider: IntegrationProvider;
  displayName: string;
  status: IntegrationStatus;
  configuration: Record<string, unknown> | null;
  credentialsSet: boolean;
  lastTestedAt: string | null;
  lastError: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntegrationConfigRequest {
  provider: IntegrationProvider;
  displayName: string;
  credentials: Record<string, unknown>;
  configuration?: Record<string, unknown>;
}

export interface UpdateIntegrationConfigRequest {
  displayName?: string;
  credentials?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
  version: number;
}

export interface IntegrationTestResult {
  success: boolean;
  error?: string;
}

// ─── Webhook Configuration (EPIC 12 Enhanced) ───

export type WebhookDeliveryStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRYING';

export const WEBHOOK_EVENT_TYPES = [
  'MESSAGE_RECEIVED',
  'MESSAGE_SENT',
  'MESSAGE_DELIVERED',
  'MESSAGE_FAILED',
  'CONTACT_CREATED',
  'CONTACT_UPDATED',
  'CAMPAIGN_COMPLETED',
  'CAMPAIGN_FAILED',
  'PAYMENT_SUCCEEDED',
  'PAYMENT_FAILED',
  'SUBSCRIPTION_CHANGED',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export interface Webhook {
  id: string;
  orgId: string;
  url: string;
  description: string | null;
  secret: string;
  events: WebhookEventType[];
  headers: Record<string, string> | null;
  enabled: boolean;
  maxRetries: number;
  timeoutMs: number;
  failureCount: number;
  disabledAt: string | null;
  version: number;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  orgId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  httpStatus: number | null;
  responseBody: string | null;
  error: string | null;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string | null;
  duration: number | null;
  createdAt: string;
}

export interface CreateWebhookRequest {
  url: string;
  events: WebhookEventType[];
  description?: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface UpdateWebhookRequest {
  url?: string;
  events?: WebhookEventType[];
  description?: string;
  headers?: Record<string, string>;
  enabled?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
  version: number;
}

export interface WebhookListResponse {
  data: Webhook[];
  total: number;
}

export interface WebhookDeliveryListResponse {
  data: WebhookDelivery[];
  total: number;
}

export interface WebhookTestResult {
  deliveryId: string;
  status: 'queued';
}
