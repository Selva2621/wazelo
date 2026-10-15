import apiClient from "./client";
import type {
  NotificationListResponse,
  ListNotificationsParams,
  UnreadCountResponse,
  MarkReadResponse,
  DeleteResponse,
  NotificationPreference,
  UpdateNotificationPreferenceRequest,
  PushConfig,
  NotificationDevice,
  DevicePermission,
} from "@/lib/types/notifications";

export const notificationsApi = {
  // ─── List ───

  list: (params?: ListNotificationsParams) =>
    apiClient
      .get<NotificationListResponse>("/notifications", { params })
      .then((r) => r.data),

  // ─── Unread Count ───

  getUnreadCount: () =>
    apiClient
      .get<UnreadCountResponse>("/notifications/unread-count")
      .then((r) => r.data),

  // ─── Mark Read ───

  markAsRead: (notificationIds: string[]) =>
    apiClient
      .patch<MarkReadResponse>("/notifications/read", { notificationIds })
      .then((r) => r.data),

  markAllAsRead: () =>
    apiClient
      .patch<MarkReadResponse>("/notifications/read-all")
      .then((r) => r.data),

  // ─── Delete ───

  delete: (notificationIds: string[]) =>
    apiClient
      .delete<DeleteResponse>("/notifications", { data: { notificationIds } })
      .then((r) => r.data),

  deleteAllRead: () =>
    apiClient
      .delete<DeleteResponse>("/notifications/read")
      .then((r) => r.data),

  // ─── Preferences ───

  getPreferences: () =>
    apiClient
      .get<NotificationPreference[]>("/notifications/preferences")
      .then((r) => r.data),

  updatePreference: (data: UpdateNotificationPreferenceRequest) =>
    apiClient
      .patch<NotificationPreference>("/notifications/preferences", data)
      .then((r) => r.data),

  // ─── Browser Push ───

  getPushConfig: () =>
    apiClient
      .get<PushConfig>("/notifications/push/config")
      .then((r) => r.data),

  // ─── Devices (one row per browser the user signed in on) ───

  listDevices: () =>
    apiClient
      .get<NotificationDevice[]>("/notifications/devices")
      .then((r) => r.data),

  registerDevice: (deviceId: string, deviceName: string) =>
    apiClient
      .post<NotificationDevice>("/notifications/devices", { deviceId, deviceName })
      .then((r) => r.data),

  /** Save the answer on this device; `subscription` goes with "granted" */
  updateDevice: (
    deviceId: string,
    permission: DevicePermission,
    subscription?: PushSubscriptionJSON,
  ) =>
    apiClient
      .patch<NotificationDevice>(`/notifications/devices/${deviceId}`, {
        permission,
        ...(subscription && {
          subscription: { endpoint: subscription.endpoint, keys: subscription.keys },
        }),
      })
      .then((r) => r.data),

  /** Sign-out: this device stops getting this user's pushes */
  detachDevicePush: (deviceId: string) =>
    apiClient
      .delete<{ pushEnabled: boolean }>(`/notifications/devices/${deviceId}/push`)
      .then((r) => r.data),

  removeDevice: (deviceId: string) =>
    apiClient
      .delete<{ removed: boolean }>(`/notifications/devices/${deviceId}`)
      .then((r) => r.data),
};
