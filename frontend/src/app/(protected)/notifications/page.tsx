"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Info, Trash2 } from "lucide-react";
import {
  useDeleteAllReadNotifications,
  useDeleteNotifications,
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
  useUnreadCount,
} from "@/hooks/use-notifications";
import { MobileNavActions } from "@/hooks/use-mobile-chrome";
import { usePageTitle } from "@/hooks/use-page-title";
import { SegmentedControl } from "@/components/ios/segmented-control";
import { SwipeRow } from "@/components/ios/swipe-row";
import { ActionSheet } from "@/components/ios/action-sheet";
import { TYPE_ICONS, timeAgo } from "@/components/notifications/notification-center";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types/notifications";

type Filter = "all" | "unread";

/** In-app link carried by the notification, if any (only paths on this site). */
function linkOf(n: Notification): string | null {
  const url = n.data?.url;
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//") ? url : null;
}

const PRIORITY_DOT: Record<Notification["priority"], string> = {
  LOW: "",
  NORMAL: "",
  HIGH: "bg-warning",
  CRITICAL: "bg-error",
};

/**
 * All notifications (also where a tapped push notification lands).
 * Mobile: the Alerts tab, iOS list with swipe actions. Desktop: a plain centred list.
 */
export default function NotificationsPage() {
  usePageTitle("Notifications");
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [menuOpen, setMenuOpen] = useState(false);

  const { data, isLoading } = useNotifications(filter === "unread" ? { isRead: false, limit: 100 } : { limit: 100 });
  const { data: unread } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAll = useMarkAllAsRead();
  const remove = useDeleteNotifications();
  const clearRead = useDeleteAllReadNotifications();

  const notifications = data?.notifications ?? [];
  const unreadCount = unread?.unreadCount ?? data?.unreadCount ?? 0;

  const open = (n: Notification) => {
    if (!n.isRead) markAsRead.mutate([n.id]);
    const link = linkOf(n);
    if (link) router.push(link);
  };

  return (
    <div className="ios-page mx-auto w-full max-w-2xl pb-6 lg:px-6 lg:py-6">
      <MobileNavActions>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="h-11 px-2 text-[17px] text-primary active:opacity-50"
        >
          Edit
        </button>
      </MobileNavActions>

      <div className="mb-3 flex items-center gap-3 px-4 lg:px-0">
        <SegmentedControl
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "unread", label: unreadCount > 0 ? `Unread (${unreadCount})` : "Unread" },
          ]}
          className="flex-1 lg:max-w-xs"
        />
        {/* Desktop has no nav bar: show the bulk actions here */}
        <div className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={unreadCount === 0 || markAll.isPending}
            className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-body text-on-surface hover:bg-surface-container disabled:opacity-40"
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
          <button
            type="button"
            onClick={() => clearRead.mutate()}
            disabled={clearRead.isPending}
            className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-body text-error hover:bg-error/10 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" /> Clear read
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center px-8 py-20 text-center">
          <span className="mb-4 grid size-16 place-items-center rounded-full bg-surface-container">
            <Bell className="h-7 w-7 text-on-surface-variant" aria-hidden />
          </span>
          <p className="text-[17px] font-semibold text-on-surface">
            {filter === "unread" ? "You're all caught up" : "No notifications yet"}
          </p>
          <p className="mt-1 text-[15px] text-on-surface-variant">We&apos;ll let you know when something happens.</p>
        </div>
      ) : (
        <ul className="ios-group-body mx-4 lg:mx-0">
          {notifications.map((n) => {
            const Icon = TYPE_ICONS[n.type] ?? Info;
            const actions = [
              {
                label: "Delete",
                icon: <Trash2 className="h-5 w-5" aria-hidden />,
                className: "bg-error",
                onAction: () => remove.mutate([n.id]),
              },
            ];
            if (!n.isRead) {
              actions.unshift({
                label: "Read",
                icon: <Check className="h-5 w-5" aria-hidden />,
                className: "bg-info",
                onAction: () => markAsRead.mutate([n.id]),
              });
            }
            return (
              <li key={n.id}>
                <SwipeRow actions={actions}>
                  <button type="button" onClick={() => open(n)} className="ios-row ios-row-tappable w-full items-start text-left">
                    <span
                      className={cn(
                        "mt-0.5 grid size-9 shrink-0 place-items-center rounded-[10px]",
                        n.isRead ? "bg-surface-container text-on-surface-variant" : "bg-primary/15 text-primary",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <span className="ios-row-main items-start">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          {!n.isRead && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                          <span
                            className={cn(
                              "truncate text-[16px] leading-[21px]",
                              n.isRead ? "text-on-surface" : "font-semibold text-on-surface",
                            )}
                          >
                            {n.title}
                          </span>
                          {PRIORITY_DOT[n.priority] && (
                            <span className={cn("size-1.5 shrink-0 rounded-full", PRIORITY_DOT[n.priority])} aria-hidden />
                          )}
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-[14px] leading-[19px] text-on-surface-variant">{n.body}</span>
                      </span>
                      <span className="ml-2 shrink-0 text-[13px] text-on-surface-variant">{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                </SwipeRow>
              </li>
            );
          })}
        </ul>
      )}

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        actions={[
          { label: "Mark all as read", disabled: unreadCount === 0, onSelect: () => markAll.mutate() },
          { label: "Clear read notifications", destructive: true, onSelect: () => clearRead.mutate() },
        ]}
      />
    </div>
  );
}
