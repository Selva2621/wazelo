// ─── Notification Types (aligned with backend Prisma enums) ───

export type NotificationType =
  | "MESSAGE_RECEIVED"
  | "CONTACT_ASSIGNED"
  | "CONTACT_REASSIGNED"
  | "CAMPAIGN_COMPLETED"
  | "CAMPAIGN_FAILED"
  | "AUTOMATION_EXECUTED"
  | "AUTOMATION_FAILED"
  | "WHATSAPP_SESSION_DISCONNECTED"
  | "PAYMENT_FAILED"
  | "USAGE_LIMIT_WARNING"
  | "USAGE_LIMIT_REACHED"
  | "SUBSCRIPTION_EXPIRING"
  | "SYSTEM_ALERT"
  | "WHATSAPP_SESSION_UNSTABLE"
  | "WHATSAPP_PHONE_INACTIVE";

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
export type NotificationChannel = "IN_APP" | "EMAIL";

export interface Notification {
  id: string;
  orgId: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  channel: NotificationChannel;
  groupKey?: string;
  createdAt: string;
}

// ─── API Request / Response ───

export interface ListNotificationsParams {
  limit?: number;
  offset?: number;
  type?: NotificationType;
  priority?: NotificationPriority;
  isRead?: boolean;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  limit: number;
  offset: number;
}

export interface MarkNotificationsReadRequest {
  notificationIds: string[];
}

export interface DeleteNotificationsRequest {
  notificationIds: string[];
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface MarkReadResponse {
  markedCount: number;
  unreadCount: number;
}

export interface DeleteResponse {
  deletedCount: number;
}

// ─── Notification Preferences ───

export interface NotificationPreference {
  id: string;
  orgId: string;
  userId: string;
  notificationType: NotificationType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  updatedAt: string;
}

export interface UpdateNotificationPreferenceRequest {
  notificationType: NotificationType;
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
}

export interface NotificationPreferencesMap {
  [type: string]: {
    inAppEnabled: boolean;
    emailEnabled: boolean;
  };
}

// ─── Browser Push ───

export interface PushConfig {
  /** False when the server has no VAPID keys */
  enabled: boolean;
  publicKey: string | null;
}

/** Answer recorded per device; "dismissed" = "Not now" in our prompt */
export type DevicePermission = "granted" | "denied" | "dismissed";

export interface NotificationDevice {
  deviceId: string;
  deviceName: string | null;
  permission: "default" | DevicePermission;
  /** We already asked on this device — never prompt again */
  prompted: boolean;
  pushEnabled: boolean;
  lastSeenAt: string;
}

// ─── WebSocket Events ───

export interface NotificationNewEvent {
  notification: Notification;
}

export interface NotificationUnreadCountEvent {
  unreadCount: number;
}
