"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  MessageSquare,
  Megaphone,
  Zap,
  AlertTriangle,
  Info,
  CreditCard,
  WifiOff,
  UserPlus,
  BarChart3,
} from "lucide-react";
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotifications,
  notificationKeys,
} from "@/hooks/use-notifications";
import { useAuthStore } from "@/stores/auth-store";
import { getSocket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type {
  Notification,
  NotificationType,
  NotificationPriority,
} from "@/lib/types/notifications";
import { IconButton } from "@/components/ui/icon-button";

const TYPE_ICONS: Record<NotificationType, typeof MessageSquare> = {
  MESSAGE_RECEIVED: MessageSquare,
  CONTACT_ASSIGNED: UserPlus,
  CONTACT_REASSIGNED: UserPlus,
  CAMPAIGN_COMPLETED: Megaphone,
  CAMPAIGN_FAILED: Megaphone,
  AUTOMATION_EXECUTED: Zap,
  AUTOMATION_FAILED: Zap,
  WHATSAPP_SESSION_DISCONNECTED: WifiOff,
  PAYMENT_FAILED: CreditCard,
  USAGE_LIMIT_WARNING: BarChart3,
  USAGE_LIMIT_REACHED: BarChart3,
  SUBSCRIPTION_EXPIRING: CreditCard,
  SYSTEM_ALERT: AlertTriangle,
};

const PRIORITY_COLORS: Record<NotificationPriority, string> = {
  LOW: "border-l-outline-variant/30",
  NORMAL: "border-l-primary/50",
  HIGH: "border-l-warning",
  CRITICAL: "border-l-error",
};

type FilterTab = "all" | "unread";

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const params =
    filter === "unread"
      ? { isRead: false as const, limit: 50 }
      : { limit: 50 };
  const { data, isLoading, refetch } = useNotifications(params);
  const { data: unreadData } = useUnreadCount();

  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotifications();

  const notifications = data?.notifications ?? [];
  const unreadCount = unreadData?.unreadCount ?? data?.unreadCount ?? 0;

  // Listen for real-time notification events via WebSocket
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const socket = getSocket(accessToken);

    const handleNewNotification = () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    };

    const handleUnreadCount = (payload: { unreadCount: number }) => {
      queryClient.setQueryData(notificationKeys.unreadCount(), {
        unreadCount: payload.unreadCount,
      });
    };

    socket.on("notification:new", handleNewNotification);
    socket.on("notification:unread-count", handleUnreadCount);

    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:unread-count", handleUnreadCount);
    };
  }, [isAuthenticated, accessToken, queryClient]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) refetch();
        }}
        className="relative grid size-10 place-items-center rounded-full bg-surface-container-low text-on-surface-variant transition-colors duration-120 ease-standard hover:bg-surface-container hover:text-on-surface"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={isOpen}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 text-caption font-semibold tabular-nums text-on-error ring-2 ring-surface">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {/* Fades with the panel's slide instead of popping */}
      <div
        aria-hidden
        className={`fixed inset-0 z-40 bg-scrim transition-[opacity,visibility] duration-300 ease-standard ${
          isOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
      />

      {/* Clipping layer: keeps the closed panel from widening the page */}
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {/* Slide-over Panel */}
      <div
        ref={panelRef}
        className={`pointer-events-auto absolute right-0 top-0 h-full w-[400px] max-w-[90vw] bg-surface border-l border-outline-variant/15 shadow-modal transition-[transform,visibility] duration-300 ease-standard ${
          isOpen ? "visible translate-x-0" : "invisible translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/15">
          <div className="flex items-center gap-2">
            <h2 className="text-title-sm font-semibold text-on-surface">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <Badge variant="primary">{unreadCount} new</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
            <IconButton size="sm"
              onClick={() => setIsOpen(false)} aria-label="Close">
              <X className="h-5 w-5" />
            </IconButton>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 px-5 py-2 border-b border-outline-variant/10">
          {(["all", "unread"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded-md text-label font-medium transition-colors ${
                filter === tab
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {tab === "all" ? "All" : "Unread"}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="overflow-y-auto h-[calc(100%-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" className="text-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-5">
              <Bell className="h-10 w-10 text-on-surface-variant/30 mb-3" />
              <p className="text-body text-on-surface-variant">
                {filter === "unread"
                  ? "No unread notifications"
                  : "No notifications yet"}
              </p>
              <p className="text-caption text-on-surface-variant/50 mt-1">
                We&apos;ll notify you when something happens
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  onMarkRead={() => markAsRead.mutate([notif.id])}
                  onDelete={() => deleteNotification.mutate([notif.id])}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}

// ─── Notification Item ──────────────────────────

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const Icon = TYPE_ICONS[notification.type] ?? Info;
  const priorityColor =
    PRIORITY_COLORS[notification.priority] ?? PRIORITY_COLORS.NORMAL;

  return (
    <div
      className={`group px-5 py-3.5 border-b border-outline-variant/10 border-l-2 ${priorityColor} hover:bg-surface-container/15 transition-colors ${
        !notification.isRead ? "bg-primary/[0.03]" : ""
      }`}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
            notification.isRead
              ? "bg-surface-container text-on-surface-variant/50"
              : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p
            className={`text-body leading-snug ${
              notification.isRead
                ? "text-on-surface-variant"
                : "text-on-surface font-medium"
            }`}
          >
            {notification.title}
          </p>
          <p className="text-label text-on-surface-variant/60 mt-0.5 line-clamp-2">
            {notification.body}
          </p>
          <p className="text-caption text-on-surface-variant/40 mt-1">
            {timeAgo(notification.createdAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-start gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.isRead && (
            <IconButton size="xs"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
              className="hover:text-primary hover:bg-primary/10"
              title="Mark as read" aria-label="Mark as read">
              <Check className="h-3.5 w-3.5" />
            </IconButton>
          )}
          <IconButton size="xs" variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
           
            title="Delete" aria-label="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
