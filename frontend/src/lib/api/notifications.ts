import apiClient from "./client";
import type {
  NotificationListResponse,
  ListNotificationsParams,
  UnreadCountResponse,
  MarkReadResponse,
  DeleteResponse,
  NotificationPreference,
  UpdateNotificationPreferenceRequest,
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
};
