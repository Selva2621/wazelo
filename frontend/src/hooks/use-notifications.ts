"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { notificationsApi } from "@/lib/api/notifications";
import type {
  ListNotificationsParams,
  UpdateNotificationPreferenceRequest,
} from "@/lib/types/notifications";

// ─── Query Key Factory ───

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params?: ListNotificationsParams) =>
    ["notifications", "list", params] as const,
  unreadCount: () => ["notifications", "unread-count"] as const,
  preferences: () => ["notifications", "preferences"] as const,
};

// ─── Query Hooks ───

export function useNotifications(params?: ListNotificationsParams) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationsApi.list(params),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30_000,
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => notificationsApi.getPreferences(),
  });
}

// ─── Mutation Hooks ───

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationIds: string[]) =>
      notificationsApi.markAsRead(notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: notificationKeys.all }); toast.success("All marked as read"); },
  });
}

export function useDeleteNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationIds: string[]) =>
      notificationsApi.delete(notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteAllReadNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.deleteAllRead(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: notificationKeys.all }); toast.success("Read notifications cleared"); },
  });
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateNotificationPreferenceRequest) =>
      notificationsApi.updatePreference(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() });
      toast.success("Preference saved");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save preference"),
  });
}
