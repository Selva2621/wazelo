/* Wazelo service worker — shows browser push notifications (urgent alerts such
   as "WhatsApp disconnected") and opens the right page when one is clicked. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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
      icon: "/favicon.png",
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
