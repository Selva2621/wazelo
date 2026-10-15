"use client";

import { BellRing, Monitor, Trash2 } from "lucide-react";
import {
  useBrowserPush,
  useNotificationDevices,
  useRemoveNotificationDevice,
} from "@/hooks/use-browser-push";
import { getDeviceId } from "@/lib/device";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

interface BrowserPushCardProps {
  /**
   * card — settings: this device's switch plus the user's other devices.
   * compact — one-line nudge that hides itself once push is on or can't be used.
   */
  variant?: "card" | "compact";
  className?: string;
}

export function BrowserPushCard({ variant = "card", className }: BrowserPushCardProps) {
  const { status, enable, dismiss, isPending, error } = useBrowserPush();
  const devices = useNotificationDevices(variant === "card" && status !== "unavailable");
  const removeDevice = useRemoveNotificationDevice();

  if (variant === "compact") {
    if (status !== "off") return null;
    return (
      <div
        className={cn(
          "flex w-full items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3 text-left",
          className,
        )}
      >
        <BellRing className="h-5 w-5 shrink-0 text-primary" />
        <p className="flex-1 text-body text-on-surface">Get an alert if WhatsApp disconnects</p>
        <Button size="sm" onClick={enable} loading={isPending}>
          Enable
        </Button>
      </div>
    );
  }

  if (status === "loading" || status === "unavailable") return null;

  const hint =
    status === "unsupported"
      ? "This browser doesn't support notifications. On iPhone, add Wazelo to your home screen first."
      : status === "denied"
        ? "Notifications are blocked for this site. Allow them in your browser's site settings."
        : status === "on"
          ? "On for this device."
          : "Urgent alerts — like WhatsApp disconnecting — even with Wazelo closed.";

  const thisDevice = getDeviceId();
  const otherDevices = (devices.data ?? []).filter((d) => d.deviceId !== thisDevice);

  return (
    <div className={cn("rounded-xl bg-surface-container-lowest p-5", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <BellRing className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium text-on-surface">Browser notifications</p>
          <p className="text-label text-on-surface-variant">{hint}</p>
          {error && (
            <p className="mt-1 text-caption text-error">
              Couldn&rsquo;t change notifications. Please try again.
            </p>
          )}
        </div>
        {status === "off" && (
          <Button size="sm" onClick={enable} loading={isPending}>
            Enable
          </Button>
        )}
        {status === "on" && (
          <Button size="sm" variant="ghost" onClick={dismiss} loading={isPending}>
            Turn off
          </Button>
        )}
      </div>

      {otherDevices.length > 0 && (
        <div className="mt-5 border-t border-outline-variant/15 pt-4">
          <p className="mb-2 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">
            Your other devices
          </p>
          <ul className="space-y-1">
            {otherDevices.map((d) => (
              <li key={d.deviceId} className="flex items-center gap-3 py-1.5">
                <Monitor className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body text-on-surface">{d.deviceName ?? "Unknown device"}</p>
                  <p className="text-caption text-on-surface-variant">
                    {d.pushEnabled ? "Notifications on" : "Notifications off"} · last seen{" "}
                    {new Date(d.lastSeenAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>
                <IconButton
                  size="sm"
                  aria-label={`Remove ${d.deviceName ?? "device"}`}
                  onClick={() => removeDevice.mutate(d.deviceId)}
                  disabled={removeDevice.isPending}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </IconButton>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
