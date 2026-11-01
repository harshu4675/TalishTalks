import { precacheAndRoute, cleanupOutdatedCaches, getCacheKeyForURL } from "workbox-precaching";
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.mode !== "navigate" || url.origin !== self.location.origin || /^\/(api|socket.io)\//.test(url.pathname)) return;
  event.respondWith(fetch(event.request).catch(async () => {
    const key = getCacheKeyForURL("/index.html");
    return (key && await caches.match(key)) || Response.error();
  }));
});
self.addEventListener("message", (event) => { if (event.data?.type === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { data = { body: event.data?.text() || "You have a new notification" }; }
  event.waitUntil(self.registration.showNotification(data.title || "Talish Talks", {
    body: data.body || "You have a new notification", icon: "/pwa-192x192.png", badge: "/pwa-192x192.png",
    tag: data.tag || "talish-notification", data: data.data || {}, renotify: true,
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin);
  const url = target.origin === self.location.origin ? target.href : `${self.location.origin}/`;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
    const client = clients.find((item) => item.url.startsWith(self.location.origin));
    if (client) { await client.navigate(url); return client.focus(); }
    return self.clients.openWindow(url);
  }));
});
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
