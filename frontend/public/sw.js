/* Wazelo service worker
   - Push notifications (urgent alerts such as "WhatsApp disconnected") and opening
     the right page when one is clicked.
   - Offline support for the installed app: static files are cached, pages and API
     calls always go to the network (business data is never cached), and an offline
     page is shown when there is no connection.

   Caching only runs when registered as /sw.js?cache=1 (production builds). In dev the
   same file is registered without the flag, so hot reload is never served stale code. */

const VERSION = "v1";
const STATIC_CACHE = `wazelo-static-${VERSION}`;
const ASSET_CACHE = `wazelo-assets-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/favicon.png",
];
const ASSET_LIMIT = 120;

const CACHING = new URL(self.location.href).searchParams.get("cache") === "1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      if (CACHING) {
        const cache = await caches.open(STATIC_CACHE);
        await cache.addAll(PRECACHE);
      }
      // First install takes over at once. Later updates wait until the page asks
      // (see "SKIP_WAITING"), so an open tab is never switched mid-session.
      if (!self.registration.active) await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = CACHING ? [STATIC_CACHE, ASSET_CACHE] : [];
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith("wazelo-") && !keep.includes(n)).map((n) => caches.delete(n)),
      );
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable().catch(() => undefined);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  // Sent on logout: drop everything cached for this site
  if (event.data === "CLEAR_CACHES") {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.filter((n) => n.startsWith("wazelo-")).map((n) => caches.delete(n)))),
    );
  }
});

/* ── Fetch ── */

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

/** Hashed build files never change, so the cached copy is always correct. */
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/** Icons, images, fonts: answer from cache, refresh in the background. */
async function staleWhileRevalidate(event) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(event.request);
  const network = fetch(event.request)
    .then((response) => {
      if (response.ok) {
        cache.put(event.request, response.clone()).then(() => trim(ASSET_CACHE, ASSET_LIMIT));
      }
      return response;
    })
    .catch(() => undefined);
  if (hit) {
    event.waitUntil(network);
    return hit;
  }
  return (await network) || Response.error();
}

/** Pages always come from the network; the offline page when there is none. */
async function networkPage(event) {
  try {
    const preloaded = await event.preloadResponse;
    if (preloaded) return preloaded;
    return await fetch(event.request);
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    return (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  if (!CACHING) return;
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Other sites (API on another domain, analytics, Meta CDN): untouched
  if (url.origin !== self.location.origin) return;
  // API, sockets, Next data and image optimizer: always live
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/socket.io") ||
    url.pathname.startsWith("/ws") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/_next/data") ||
    url.searchParams.has("_rsc")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkPage(event));
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event));
  }
});

/* ── Push ── */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Wazelo", {
      body: data.body || "",
      tag: data.tag,
      renotify: Boolean(data.tag),
      icon: "/icons/icon-192.png",
      badge: "/favicon.png",
      data: { url: data.url || "/notifications" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Only ever open pages of this site
  let url = new URL("/", self.location.origin).href;
  try {
    const target = new URL(event.notification.data?.url || "/", self.location.origin);
    if (target.origin === self.location.origin) url = target.href;
  } catch {
    /* keep the home page */
  }

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const exact = windows.find((w) => w.url === url);
      if (exact) return exact.focus();
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open && "navigate" in open) {
        await open.navigate(url);
        return open.focus();
      }
      return self.clients.openWindow(url);
    })(),
  );
});
