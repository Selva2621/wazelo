/**
 * The one place the service worker is registered (push hook + PWA provider).
 * Both must use the same script URL, or each registration replaces the other.
 * Production adds ?cache=1 to turn on offline caching; dev keeps push only.
 */
const SW_URL = process.env.NODE_ENV === "production" ? "/sw.js?cache=1" : "/sw.js";

export function swSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator;
}

export function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register(SW_URL, { scope: "/", updateViaCache: "none" });
}

/** Clears cached files (called on logout so nothing stays behind on a shared device). */
export function clearServiceWorkerCaches(): void {
  if (!swSupported()) return;
  navigator.serviceWorker.controller?.postMessage("CLEAR_CACHES");
}
