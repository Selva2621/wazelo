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
        className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 transition-opacity" />
      )}

      {/* Slide-over Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 z-50 h-full w-[400px] max-w-[90vw] bg-surface border-l border-outline-variant/15 shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/15">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-on-surface">
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
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 px-5 py-2 border-b border-outline-variant/10">
          {(["all", "unread"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
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
              <p className="text-[13px] text-on-surface-variant">
                {filter === "unread"
                  ? "No unread notifications"
                  : "No notifications yet"}
              </p>
              <p className="text-[11px] text-on-surface-variant/50 mt-1">
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
            className={`text-[13px] leading-snug ${
              notification.isRead
                ? "text-on-surface-variant"
                : "text-on-surface font-medium"
            }`}
          >
            {notification.title}
          </p>
          <p className="text-[12px] text-on-surface-variant/60 mt-0.5 line-clamp-2">
            {notification.body}
          </p>
          <p className="text-[10px] text-on-surface-variant/40 mt-1">
            {timeAgo(notification.createdAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-start gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.isRead && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
              className="p-1 rounded text-on-surface-variant/50 hover:text-primary hover:bg-primary/10 transition-colors"
              title="Mark as read"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded text-on-surface-variant/50 hover:text-error hover:bg-error/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
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
