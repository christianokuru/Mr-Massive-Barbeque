/* Massive Barbeque service worker: offline fallback, static caching, admin + customer order alerts. */
const VERSION = "mb-v2";
const STATIC = `${VERSION}-static`;
const OFFLINE_URL = "/offline";

// Never cache personal, transactional or API responses.
const NEVER = [/^\/api\//, /^\/account/, /^\/admin/, /^\/checkout/, /^\/cart/, /^\/auth\//, /^\/sign-/, /^\/track/];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC).then((c) => c.addAll([OFFLINE_URL, "/brand/logo.png", "/icons/icon-192.png"])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER.some((re) => re.test(url.pathname))) {
    if (req.mode === "navigate") event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  // Immutable build assets: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(STATIC).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }
  // Pages: network first, offline page as fallback (not cached, so prices/stock stay live).
  if (req.mode === "navigate") event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Massive Barbeque", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Massive Barbeque", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      // Same order, newer status: buzz again instead of silently replacing the old one.
      renotify: !!data.tag,
      vibrate: [120, 60, 120],
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Only ever open same-origin URLs.
  let target = "/";
  try {
    const u = new URL(event.notification.data && event.notification.data.url ? event.notification.data.url : "/", self.location.origin);
    if (u.origin === self.location.origin) target = u.pathname + u.search;
  } catch {}
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (new URL(c.url).origin === self.location.origin && "focus" in c) {
          c.navigate(target);
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
