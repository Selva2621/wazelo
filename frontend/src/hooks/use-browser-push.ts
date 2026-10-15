"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api/notifications";
import { getDeviceId, getDeviceName } from "@/lib/device";
import type { DevicePermission, NotificationDevice } from "@/lib/types/notifications";

export type BrowserPushStatus =
  | "loading"
  /** Browser can't do Web Push (e.g. iOS Safari outside a home-screen app) */
  | "unsupported"
  /** Server has no VAPID keys */
  | "unavailable"
  /** User blocked notifications for this site in the browser */
  | "denied"
  | "off"
  | "on";

const DEVICE_KEY = ["notification-devices", "current"];
const DEVICES_KEY = ["notification-devices", "list"];

function isSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** This browser's push subscription, creating it when needed (permission must be granted). */
async function browserSubscription(publicKey: string): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  return (
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))
  );
}

/**
 * Browser push for this device. The device is recorded per user; we ask for
 * permission once per device, and pushes reach only the signed-in user's devices.
 */
export function useBrowserPush() {
  const queryClient = useQueryClient();
  const supported = isSupported();

  const config = useQuery({
    queryKey: ["browser-push", "config"],
    queryFn: () => notificationsApi.getPushConfig(),
    enabled: supported,
    staleTime: Infinity,
  });
  const publicKey = config.data?.enabled ? config.data.publicKey : null;

  // Registers this device for the signed-in user (once per page load)
  const device = useQuery({
    queryKey: DEVICE_KEY,
    queryFn: () => notificationsApi.registerDevice(getDeviceId(), getDeviceName()),
    enabled: supported && Boolean(publicKey),
    staleTime: Infinity,
  });

  const save = (updated: NotificationDevice) => {
    queryClient.setQueryData(DEVICE_KEY, updated);
    queryClient.invalidateQueries({ queryKey: DEVICES_KEY });
  };

  const record = async (permission: NotificationPermission | "dismissed") => {
    if (permission === "granted") {
      const sub = await browserSubscription(publicKey!);
      return notificationsApi.updateDevice(getDeviceId(), "granted", sub.toJSON());
    }
    const answer: DevicePermission = permission === "denied" ? "denied" : "dismissed";
    return notificationsApi.updateDevice(getDeviceId(), answer);
  };

  // Keep the table in step with the browser — no prompt involved. If the
  // browser already allows notifications (granted earlier, maybe by someone
  // else signed in here), attach push to this user unless they turned it off.
  const synced = useRef(false);
  useEffect(() => {
    const current = device.data;
    if (!current || !publicKey || synced.current) return;
    synced.current = true;

    const browser = Notification.permission;
    const attach = browser === "granted" && !current.pushEnabled && current.permission !== "dismissed";
    const markDenied = browser === "denied" && current.permission !== "denied";
    if (attach || markDenied) {
      record(browser).then(save).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device.data, publicKey]);

  /** Our prompt's "Enable" (or the settings button): asks the browser, saves the answer. */
  const enable = useMutation({
    mutationFn: async () => record(await Notification.requestPermission()),
    onSuccess: save,
  });

  /** "Not now" in the prompt, or "Turn off": remembered, so we don't ask again. */
  const dismiss = useMutation({
    mutationFn: () => notificationsApi.updateDevice(getDeviceId(), "dismissed"),
    onSuccess: save,
  });

  let status: BrowserPushStatus;
  if (!supported) status = "unsupported";
  else if (config.isLoading || (publicKey && device.isLoading)) status = "loading";
  else if (!publicKey || !device.data) status = "unavailable";
  else if (Notification.permission === "denied") status = "denied";
  else status = device.data.pushEnabled ? "on" : "off";

  return {
    status,
    /** Show the one-time prompt: never asked on this device, browser hasn't decided */
    shouldPrompt: status === "off" && !device.data?.prompted && Notification.permission === "default",
    enable: () => enable.mutate(),
    dismiss: () => dismiss.mutate(),
    isPending: enable.isPending || dismiss.isPending,
    error: enable.error ?? dismiss.error,
  };
}

/** The signed-in user's devices, for the settings list. */
export function useNotificationDevices(enabled = true) {
  return useQuery({
    queryKey: DEVICES_KEY,
    queryFn: () => notificationsApi.listDevices(),
    enabled,
  });
}

export function useRemoveNotificationDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) => notificationsApi.removeDevice(deviceId),
    onSuccess: (_, deviceId) => {
      queryClient.invalidateQueries({ queryKey: DEVICES_KEY });
      if (deviceId === getDeviceId()) queryClient.invalidateQueries({ queryKey: DEVICE_KEY });
    },
  });
}
