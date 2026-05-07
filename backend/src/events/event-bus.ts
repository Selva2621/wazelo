// Event bus is provided by @nestjs/event-emitter (EventEmitter2).
// This file defines event payload types for type safety.

export interface UserRegisteredEvent {
  userId: string;
  orgId: string;
  email: string;
}

export interface EmailVerifiedEvent {
  userId: string;
}

export interface LoginSuccessEvent {
  userId: string;
  orgId: string;
}

export interface LoginFailedEvent {
  userId: string;
  orgId: string;
  failedAttempts: number;
}

export interface AccountLockedEvent {
  userId: string;
  orgId: string;
  lockedUntil: Date;
}

export interface PasswordResetRequestedEvent {
  userId: string;
  orgId: string;
}

export interface PasswordResetCompletedEvent {
  userId: string;
}

export interface LogoutEvent {
  userId: string;
  orgId: string;
}

export interface SessionRevokedEvent {
  sessionId: string;
  userId: string;
  orgId: string;
}

// ─────────────────────────────────────────────
// EPIC 2 — Organization & User Management Events
// ─────────────────────────────────────────────

export interface UserInvitedEvent {
  orgId: string;
  invitedById: string;
  invitationId: string;
  email: string;
  role: string;
}

export interface InvitationAcceptedEvent {
  orgId: string;
  userId: string;
  invitationId: string;
  email: string;
  role: string;
}

export interface UserCreatedEvent {
  orgId: string;
  userId: string;
  email: string;
  role: string;
  createdById: string;
}

export interface UserDisabledEvent {
  orgId: string;
  userId: string;
  disabledById: string;
}

export interface UserEnabledEvent {
  orgId: string;
  userId: string;
  enabledById: string;
}

export interface UserDeletedEvent {
  orgId: string;
  userId: string;
  deletedById: string;
}

export interface RoleChangedEvent {
  orgId: string;
  userId: string;
  previousRole: string;
  newRole: string;
  changedById: string;
}

export interface OrgSettingsUpdatedEvent {
  orgId: string;
  userId: string;
  changes: Record<string, unknown>;
}

// ─────────────────────────────────────────────
// EPIC 3 — WhatsApp Integration Events
// ─────────────────────────────────────────────

export interface WhatsAppQrGeneratedEvent {
  sessionId: string;
  orgId: string;
  userId: string;
}

export interface WhatsAppSessionConnectedEvent {
  sessionId: string;
  orgId: string;
  userId: string;
  phoneNumber: string;
}

export interface WhatsAppSessionDisconnectedEvent {
  sessionId: string;
  orgId: string;
  userId: string;
  reason: string;
}

export interface WhatsAppSessionReconnectingEvent {
  sessionId: string;
  orgId: string;
  userId: string;
  attempt: number;
}

export interface WhatsAppSessionForceDisconnectedEvent {
  sessionId: string;
  orgId: string;
  userId: string;
  disconnectedById: string;
}

export interface WhatsAppMessageReceivedEvent {
  messageId: string;
  sessionId: string;
  orgId: string;
  userId: string;
  contactPhone: string;
  type: string;
  conversationId: string;
}

export interface WhatsAppMessageSentEvent {
  messageId: string;
  sessionId: string;
  orgId: string;
  contactPhone: string;
  whatsappMessageId: string;
}

export interface WhatsAppMessageDeliveredEvent {
  messageId: string;
  orgId: string;
  whatsappMessageId: string;
}

export interface WhatsAppMessageReadEvent {
  messageId: string;
  orgId: string;
  whatsappMessageId: string;
}

export interface WhatsAppMessageFailedEvent {
  messageId: string;
  sessionId: string;
  orgId: string;
  reason: string;
  retryCount: number;
}

export interface WhatsAppStatusUpdateEvent {
  sessionId: string;
  orgId: string;
  userId: string;
  status: string;
  previousStatus: string;
}

// ─────────────────────────────────────────────
// EPIC 4 — Contact & Lead Management Events
// ─────────────────────────────────────────────

export interface ContactCreatedEvent {
  contactId: string;
  orgId: string;
  phoneNumber: string;
  ownerId: string;
  source: string;
  createdById: string;
}

export interface ContactAutoCreatedEvent {
  contactId: string;
  orgId: string;
  phoneNumber: string;
  ownerId: string;
  sessionId: string;
  messageId: string;
}

export interface ContactUpdatedEvent {
  contactId: string;
  orgId: string;
  updatedById: string;
  changes: Record<string, unknown>;
}

export interface ContactDeletedEvent {
  contactId: string;
  orgId: string;
  deletedById: string;
}

export interface ContactMergedEvent {
  primaryContactId: string;
  mergedContactId: string;
  orgId: string;
  mergedById: string;
}

export interface ContactAssignedEvent {
  contactId: string;
  orgId: string;
  ownerId: string;
  assignedById: string;
}

export interface ContactReassignedEvent {
  contactId: string;
  orgId: string;
  previousOwnerId: string;
  newOwnerId: string;
  reassignedById: string;
}

export interface ContactStatusChangedEvent {
  contactId: string;
  orgId: string;
  previousStatus: string;
  newStatus: string;
  changedById: string;
}

export interface ContactNoteAddedEvent {
  noteId: string;
  contactId: string;
  orgId: string;
  authorId: string;
}

export interface ContactTagAddedEvent {
  contactId: string;
  tagId: string;
  tagName: string;
  orgId: string;
  addedById: string;
}

export interface ContactTagRemovedEvent {
  contactId: string;
  tagId: string;
  tagName: string;
  orgId: string;
  removedById: string;
}

// ─────────────────────────────────────────────
// Social Ads Lead Integration Events
// ─────────────────────────────────────────────

export interface LeadAdReceivedEvent {
  leadAdEntryId: string;
  orgId: string;
  leadgenId: string;
  pageId: string;
  platform: string;
  contactId: string;
  contactPhone: string;
  contactName: string | null;
  contactEmail: string | null;
  adName: string | null;
  campaignName: string | null;
  formId: string | null;
  leadData: Record<string, unknown>;
}

export interface LeadAdProcessedEvent {
  leadAdEntryId: string;
  orgId: string;
  contactId: string;
  leadgenId: string;
  platform: string;
}

export interface LeadAdFailedEvent {
  leadAdEntryId: string;
  orgId: string;
  leadgenId: string;
  error: string;
  retryCount: number;
}

// ─────────────────────────────────────────────
// EPIC 16 — Multi-Channel Integration Events
// ─────────────────────────────────────────────

export interface ChannelCreatedEvent {
  orgId: string;
  channelId: string;
  channelType: string;
  userId: string;
}

export interface ChannelUpdatedEvent {
  orgId: string;
  channelId: string;
  channelType: string;
  userId: string;
  changes: Record<string, unknown>;
}

export interface ChannelVerifiedEvent {
  orgId: string;
  channelId: string;
  channelType: string;
}

export interface ChannelSuspendedEvent {
  orgId: string;
  channelId: string;
  channelType: string;
  reason: string;
}

export interface ChannelReactivatedEvent {
  orgId: string;
  channelId: string;
  channelType: string;
}

export interface ChannelDeletedEvent {
  orgId: string;
  channelId: string;
  channelType: string;
}

export interface ChannelErrorEvent {
  orgId: string;
  channelId: string;
  channelType: string;
  error: string;
}

export interface ChannelMessageSentEvent {
  orgId: string;
  messageId: string;
  channelId: string;
  channelType: string;
  conversationId: string;
  externalMessageId: string;
}

export interface ChannelMessageReceivedEvent {
  orgId: string;
  messageId: string;
  channelId: string;
  channelType: string;
  conversationId: string;
  senderIdentifier: string;
  senderName?: string;
}

export interface ChannelMessageDeliveredEvent {
  orgId: string;
  messageId: string;
  channelId: string;
  conversationId: string;
  externalMessageId: string;
}

export interface ChannelMessageReadEvent {
  orgId: string;
  messageId: string;
  channelId: string;
  conversationId: string;
  externalMessageId: string;
}

export interface ChannelMessageFailedEvent {
  orgId: string;
  messageId: string;
  channelId?: string;
  error: string;
}

// ─────────────────────────────────────────────
// EPIC 5 — Messaging Engine Events
// ─────────────────────────────────────────────

export interface MessageQueuedEvent {
  messageId: string;
  conversationId: string;
  sessionId: string;
  orgId: string;
  contactPhone: string;
  type: string;
}

export interface MessageProcessingEvent {
  messageId: string;
  sessionId: string;
  orgId: string;
}

export interface MessageDeadLetteredEvent {
  messageId: string;
  orgId: string;
  reason: string;
  retryCount: number;
}

export interface MessageReprocessedEvent {
  deadLetterId: string;
  messageId: string;
  orgId: string;
  userId: string;
}

export interface ConversationCreatedEvent {
  conversationId: string;
  orgId: string;
  sessionId: string;
  contactPhone: string;
}

export interface ConversationUpdatedEvent {
  conversationId: string;
  orgId: string;
  lastMessageAt: Date;
  lastMessageBody?: string;
  unreadCount: number;
}

export interface ConversationClosedEvent {
  conversationId: string;
  orgId: string;
  contactPhone: string;
  assignedToId: string | null;
  sessionId: string;
  status: 'CLOSED' | 'ARCHIVED';
  closedById: string;
}

export interface RateLimitExceededEvent {
  sessionId: string;
  orgId: string;
  userId: string;
  limitType: 'session' | 'org';
  currentCount: number;
  maxAllowed: number;
}

// ─────────────────────────────────────────────
// EPIC 6 — Campaign Management Events
// ─────────────────────────────────────────────

export interface CampaignCreatedEvent {
  campaignId: string;
  orgId: string;
  createdById: string;
  name: string;
}

export interface CampaignUpdatedEvent {
  campaignId: string;
  orgId: string;
  updatedById: string;
}

export interface CampaignScheduledEvent {
  campaignId: string;
  orgId: string;
  scheduledAt: string;
  timezone: string;
}

export interface CampaignStartedEvent {
  campaignId: string;
  orgId: string;
  totalRecipients: number;
}

export interface CampaignProgressEvent {
  campaignId: string;
  orgId: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  readCount: number;
}

export interface CampaignCompletedEvent {
  campaignId: string;
  orgId: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
}

export interface CampaignPausedEvent {
  campaignId: string;
  orgId: string;
  pausedById: string;
}

export interface CampaignResumedEvent {
  campaignId: string;
  orgId: string;
  resumedById: string;
}

export interface CampaignFailedEvent {
  campaignId: string;
  orgId: string;
  reason: string;
}

export interface CampaignCancelledEvent {
  campaignId: string;
  orgId: string;
  cancelledById: string;
}

// ─────────────────────────────────────────────
// EPIC 7 — Scheduling & Automation Events
// ─────────────────────────────────────────────

export interface ScheduledMessageCreatedEvent {
  scheduledMessageId: string;
  orgId: string;
  createdById: string;
  scheduledAt: string;
  contactPhone: string;
}

export interface ScheduledMessageUpdatedEvent {
  scheduledMessageId: string;
  orgId: string;
  updatedById: string;
}

export interface ScheduledMessageCancelledEvent {
  scheduledMessageId: string;
  orgId: string;
  cancelledById: string;
}

export interface ScheduledMessageExecutedEvent {
  scheduledMessageId: string;
  orgId: string;
  messageId: string;
  contactPhone: string;
}

export interface ScheduledMessageFailedEvent {
  scheduledMessageId: string;
  orgId: string;
  reason: string;
  retryCount: number;
}

export interface AutomationRuleCreatedEvent {
  ruleId: string;
  orgId: string;
  createdById: string;
  triggerType: string;
  name: string;
}

export interface AutomationRuleUpdatedEvent {
  ruleId: string;
  orgId: string;
  updatedById: string;
}

export interface AutomationRuleEnabledEvent {
  ruleId: string;
  orgId: string;
  enabledById: string;
}

export interface AutomationRuleDisabledEvent {
  ruleId: string;
  orgId: string;
  disabledById: string;
}

export interface AutomationRuleDeletedEvent {
  ruleId: string;
  orgId: string;
  deletedById: string;
}

export interface AutomationTriggeredEvent {
  executionId: string;
  ruleId: string;
  orgId: string;
  contactId?: string;
  triggerType: string;
  triggerPayload: Record<string, unknown>;
}

export interface AutomationExecutedEvent {
  executionId: string;
  ruleId: string;
  orgId: string;
  contactId?: string;
  actionResults: Record<string, unknown>[];
  executionTimeMs: number;
}

export interface AutomationFailedEvent {
  executionId: string;
  ruleId: string;
  orgId: string;
  contactId?: string;
  error: string;
  retryCount: number;
}

export interface FollowUpScheduledEvent {
  ruleId: string;
  orgId: string;
  contactId: string;
  delaySeconds: number;
  scheduledAt: string;
}

export interface FollowUpCancelledEvent {
  ruleId: string;
  orgId: string;
  contactId: string;
  reason: string;
}

export interface FollowUpExecutedEvent {
  ruleId: string;
  orgId: string;
  contactId: string;
  messageId: string;
}

// ─────────────────────────────────────────────
// EPIC 9 — Subscription & Billing Events
// ─────────────────────────────────────────────

export interface SubscriptionCreatedEvent {
  subscriptionId: string;
  orgId: string;
  planId: string;
  planName: string;
  status: string;
  userId: string;
}

export interface SubscriptionUpgradedEvent {
  subscriptionId: string;
  orgId: string;
  previousPlanId: string;
  newPlanId: string;
  proratedAmountInCents: number;
  userId: string;
}

export interface SubscriptionDowngradeScheduledEvent {
  subscriptionId: string;
  orgId: string;
  currentPlanId: string;
  scheduledPlanId: string;
  scheduledAt: string;
  userId: string;
}

export interface SubscriptionDowngradeAppliedEvent {
  subscriptionId: string;
  orgId: string;
  previousPlanId: string;
  newPlanId: string;
}

export interface SubscriptionCancelledEvent {
  subscriptionId: string;
  orgId: string;
  userId: string;
  reason?: string;
}

export interface SubscriptionRenewedEvent {
  subscriptionId: string;
  orgId: string;
  planId: string;
  newPeriodStart: string;
  newPeriodEnd: string;
}

export interface SubscriptionExpiredEvent {
  subscriptionId: string;
  orgId: string;
  planId: string;
}

export interface SubscriptionGracePeriodEvent {
  subscriptionId: string;
  orgId: string;
  graceEndsAt: string;
}

export interface SubscriptionReactivatedEvent {
  subscriptionId: string;
  orgId: string;
  userId: string;
}

export interface PaymentSucceededEvent {
  paymentId: string;
  orgId: string;
  subscriptionId: string;
  amountInCents: number;
}

export interface PaymentFailedEvent {
  paymentId: string;
  orgId: string;
  subscriptionId: string;
  reason: string;
  retryCount: number;
}

export interface InvoiceGeneratedEvent {
  invoiceId: string;
  orgId: string;
  subscriptionId: string;
  invoiceNumber: string;
  amountInCents: number;
}

export interface UsageLimitReachedEvent {
  orgId: string;
  metricType: string;
  currentValue: number;
  limitValue: number;
}

export interface UsageSoftLimitWarningEvent {
  orgId: string;
  metricType: string;
  currentValue: number;
  limitValue: number;
  percentUsed: number;
}

export interface UsageCounterResetEvent {
  orgId: string;
  metricTypes: string[];
  periodStart: string;
  periodEnd: string;
}

export interface PlanCreatedEvent {
  planId: string;
  name: string;
  slug: string;
  userId: string;
}

export interface PlanUpdatedEvent {
  planId: string;
  name: string;
  userId: string;
  changes: Record<string, unknown>;
}

// ─── EPIC 10: Observability Events ───────────

export interface MetricRecordedEvent {
  metric: string;
  value: number;
  tags?: Record<string, unknown>;
  orgId?: string;
}

export interface AlertTriggeredEvent {
  ruleId: string;
  ruleName: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  channels: string[];
  channelConfig: unknown;
  timestamp: string;
}

export interface ErrorTrackedEvent {
  fingerprint: string;
  message: string;
  stack?: string;
  traceId: string;
  orgId?: string;
  userId?: string;
  statusCode?: number;
  count: number;
  timestamp: string;
}

export interface HealthCheckFailedEvent {
  component: string;
  queue?: string;
  depth?: number;
  threshold?: number;
  severity: 'warning' | 'critical';
  timestamp: string;
}

// ─────────────────────────────────────────────
// EPIC 11 — Notification Events
// ─────────────────────────────────────────────

export interface NotificationCreatedEvent {
  notificationId: string;
  orgId: string;
  userId: string;
  type: string;
  priority: string;
  title: string;
  channel: string;
}

export interface NotificationReadEvent {
  notificationId: string;
  orgId: string;
  userId: string;
}

export interface NotificationAllReadEvent {
  orgId: string;
  userId: string;
  count: number;
}

export interface NotificationDeletedEvent {
  notificationId: string;
  orgId: string;
  userId: string;
}

export interface NotificationPreferencesUpdatedEvent {
  orgId: string;
  userId: string;
  notificationType: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
}

// ─────────────────────────────────────────────
// EPIC 12 — Settings & Configuration Events
// ─────────────────────────────────────────────

export interface SettingUpdatedEvent {
  settingId: string;
  orgId: string | null;
  scope: string;
  category: string;
  key: string;
  previousValue: unknown;
  newValue: unknown;
  userId: string;
}

export interface SettingDeletedEvent {
  settingId: string;
  orgId: string | null;
  scope: string;
  category: string;
  key: string;
  userId: string;
}

export interface FeatureFlagCreatedEvent {
  flagId: string;
  orgId: string | null;
  scope: string;
  featureKey: string;
  enabled: boolean;
  userId: string;
}

export interface FeatureFlagUpdatedEvent {
  flagId: string;
  orgId: string | null;
  scope: string;
  featureKey: string;
  previousEnabled: boolean;
  enabled: boolean;
  userId: string;
}

export interface FeatureFlagDeletedEvent {
  flagId: string;
  orgId: string | null;
  scope: string;
  featureKey: string;
  userId: string;
}

export interface IntegrationConfigCreatedEvent {
  integrationId: string;
  orgId: string;
  provider: string;
  userId: string;
}

export interface IntegrationConfigUpdatedEvent {
  integrationId: string;
  orgId: string;
  provider: string;
  userId: string;
  changes: Record<string, unknown>;
}

export interface IntegrationConfigDeletedEvent {
  integrationId: string;
  orgId: string;
  provider: string;
  userId: string;
}

export interface IntegrationConfigTestedEvent {
  integrationId: string;
  orgId: string;
  provider: string;
  success: boolean;
  error?: string;
  userId: string;
}

export interface WebhookCreatedEvent {
  webhookId: string;
  orgId: string;
  url: string;
  events: string[];
  userId: string;
}

export interface WebhookUpdatedEvent {
  webhookId: string;
  orgId: string;
  userId: string;
  changes: Record<string, unknown>;
}

export interface WebhookDeletedEvent {
  webhookId: string;
  orgId: string;
  userId: string;
}

export interface WebhookDeliveredEvent {
  deliveryId: string;
  webhookId: string;
  orgId: string;
  eventType: string;
  httpStatus: number;
  durationMs: number;
}

export interface WebhookDeliveryFailedEvent {
  deliveryId: string;
  webhookId: string;
  orgId: string;
  eventType: string;
  error: string;
  retryCount: number;
  willRetry: boolean;
}

// ─────────────────────────────────────────────
// SLA Tracking events (EPIC 15)
// ─────────────────────────────────────────────

export interface SlaPolicyCreatedEvent {
  policyId: string;
  orgId: string;
  name: string;
  metricType: string;
  thresholdMs: number;
  createdById: string;
}

export interface SlaPolicyUpdatedEvent {
  policyId: string;
  orgId: string;
  changes: Record<string, unknown>;
  updatedById: string;
}

export interface SlaPolicyDeletedEvent {
  policyId: string;
  orgId: string;
  deletedById: string;
}

export interface SlaTrackingStartedEvent {
  trackingId: string;
  orgId: string;
  policyId: string;
  conversationId: string;
  assignedUserId: string | null;
  deadlineAt: string;
}

export interface SlaWarningTriggeredEvent {
  trackingId: string;
  orgId: string;
  policyId: string;
  conversationId: string;
  assignedUserId: string | null;
  elapsedMs: number;
  thresholdMs: number;
  warningThresholdMs: number;
}

export interface SlaBreachDetectedEvent {
  breachId: string;
  trackingId: string;
  orgId: string;
  policyId: string;
  conversationId: string;
  assignedUserId: string | null;
  metricType: string;
  thresholdMs: number;
  actualMs: number;
}

export interface SlaBreachAcknowledgedEvent {
  breachId: string;
  orgId: string;
  acknowledgedById: string;
}

export interface SlaBreachResolvedEvent {
  breachId: string;
  trackingId: string;
  orgId: string;
  policyId: string;
  conversationId: string;
  resolvedMs: number;
}

export interface SlaEscalationTriggeredEvent {
  breachId: string;
  orgId: string;
  policyId: string;
  conversationId: string;
  escalationLevel: number;
  notifyUserIds: string[];
}

// ─────────────────────────────────────────────
// Chat Widget Events
// ─────────────────────────────────────────────

export interface WidgetMessageReceivedAutomationEvent {
  orgId: string;
  sessionId: string;
  messageId: string;
  visitorId: string;
  visitorName?: string;
  visitorPhone?: string;
  body: string;
}
