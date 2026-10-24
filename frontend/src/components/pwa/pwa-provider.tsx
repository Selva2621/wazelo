"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { registerServiceWorker, swSupported } from "@/lib/pwa/register-sw";
import { reconnectSocketIfNeeded } from "@/lib/socket";
import { MOBILE_QUERY } from "@/hooks/use-is-mobile";
import { usePwaStore, type BeforeInstallPromptEvent } from "@/stores/pwa-store";
import { useThemeStore } from "@/stores/theme-store";

const UPDATE_CHECK_MS = 30 * 60 * 1000;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * App-wide PWA wiring: service worker + updates, install event, online state,
 * standalone mode, and the browser bar colour. Renders nothing itself.
 * Desktop gets updates silently; phones/tablets get a "new version" toast.
 */
export function PwaProvider() {
  const setInstallEvent = usePwaStore((s) => s.setInstallEvent);
  const setStandalone = usePwaStore((s) => s.setStandalone);
  const setOnline = usePwaStore((s) => s.setOnline);
  const setWaitingWorker = usePwaStore((s) => s.setWaitingWorker);
  const waitingWorker = usePwaStore((s) => s.waitingWorker);
  const theme = useThemeStore((s) => s.theme);
  const reloadRequested = useRef(false);

  // Service worker + update detection
  useEffect(() => {
    if (!swSupported()) return;
    let registration: ServiceWorkerRegistration | undefined;
    let lastCheck = Date.now();

    const onWaiting = (worker: ServiceWorker) => {
      if (window.matchMedia(MOBILE_QUERY).matches) setWaitingWorker(worker);
      else worker.postMessage("SKIP_WAITING"); // desktop: switch quietly, no UI
    };

    const watch = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting && navigator.serviceWorker.controller) onWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) onWaiting(worker);
        });
      });
    };

    const onControllerChange = () => {
      if (reloadRequested.current) window.location.reload();
    };

    // Look for a new version when the app comes back to the foreground
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !registration) return;
      if (Date.now() - lastCheck < UPDATE_CHECK_MS) return;
      lastCheck = Date.now();
      registration.update().catch(() => undefined);
    };

    registerServiceWorker()
      .then((reg) => {
        registration = reg;
        watch(reg);
      })
      .catch(() => undefined);

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [setWaitingWorker]);

  // "New version" toast (mobile only; see onWaiting)
  useEffect(() => {
    if (!waitingWorker) return;
    toast("A new version of Wazelo is ready", {
      id: "pwa-update",
      duration: Infinity,
      action: {
        label: "Reload",
        onClick: () => {
          reloadRequested.current = true;
          waitingWorker.postMessage("SKIP_WAITING");
        },
      },
    });
  }, [waitingWorker]);

  // Install event, standalone mode, online state, socket recovery
  useEffect(() => {
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const syncStandalone = () => {
      const value = isStandalone();
      setStandalone(value);
      document.documentElement.toggleAttribute("data-standalone", value);
    };
    syncStandalone();
    setOnline(navigator.onLine);

    const onInstallPrompt = (e: Event) => {
      e.preventDefault(); // keep it for our own button instead of the browser's mini-bar
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      syncStandalone();
    };
    const onOnline = () => {
      setOnline(true);
      reconnectSocketIfNeeded();
    };
    const onOffline = () => setOnline(false);
    const onVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) reconnectSocketIfNeeded();
    };

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    standaloneQuery.addEventListener("change", syncStandalone);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      standaloneQuery.removeEventListener("change", syncStandalone);
    };
  }, [setInstallEvent, setStandalone, setOnline]);

  // Browser bar / status bar colour follows the theme's page colour
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const surface = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim();
      if (!surface) return;
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", surface));
    });
    return () => cancelAnimationFrame(frame);
  }, [theme]);

  return null;
}
