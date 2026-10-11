"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useSANotifications, useSANotificationActions } from "@/hooks/use-super-admin";
import type { SuperAdminNotification } from "@/lib/api/super-admin";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Super admin inbox in the top bar: unread badge (polled every minute) and a dropdown list. */
export function NotificationBell() {
  const router = useRouter();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError, refetch } = useSANotifications();
  const { markRead, markAllRead } = useSANotificationActions();

  const items = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  // Close on outside click and Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openItem = (n: SuperAdminNotification) => {
    if (!n.readAt) markRead.mutate(n.id);
    setOpen(false);
    if (n.link?.startsWith("/super-admin/")) router.push(n.link);
  };

  const readAll = () =>
    markAllRead.mutate(undefined, {
      onSuccess: () => toast.success("All notifications marked as read."),
      onError: () => toast.error("Could not mark notifications as read"),
    });

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        aria-controls={panelId}
        className="relative grid size-9 place-items-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 text-caption font-semibold tabular-nums text-on-error ring-2 ring-surface-container-lowest">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-1.5 z-40 w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-xl bg-surface-container shadow-popover"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
            <h2 className="text-body-lg font-medium text-on-surface">Notifications</h2>
            {unread > 0 && (
              <button
                type="button"
                onClick={readAll}
                disabled={markAllRead.isPending}
                className="text-label font-medium text-primary hover:underline disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-1.5">
            {isLoading ? (
              <div className="flex justify-center py-6" role="status">
                <Spinner className="text-primary" />
                <span className="sr-only">Loading notifications…</span>
              </div>
            ) : isError ? (
              <p className="px-3 py-4 text-body text-error" role="alert">
                Could not load notifications.{" "}
                <button type="button" onClick={() => refetch()} className="underline hover:no-underline">
                  Try again
                </button>
              </p>
            ) : !items.length ? (
              <p className="px-3 py-6 text-center text-body text-on-surface-variant">You&apos;re all caught up.</p>
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openItem(n)}
                      className={cn(
                        "flex w-full gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-container-high focus-visible:bg-surface-container-high focus-visible:outline-none",
                      )}
                    >
                      <span
                        className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-primary")}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-body-lg text-on-surface", !n.readAt && "font-medium")}>
                          {n.title}
                          {!n.readAt && <span className="sr-only"> (unread)</span>}
                        </span>
                        <span className="block text-body text-on-surface-variant line-clamp-2">{n.body}</span>
                        <time dateTime={n.createdAt} className="block text-label text-on-surface-variant mt-0.5">
                          {timeAgo(n.createdAt)}
                        </time>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
