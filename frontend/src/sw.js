import { precacheAndRoute } from "workbox-precaching";

// Precache assets
precacheAndRoute(self.__WB_MANIFEST);

// 🔥 Listen for skip waiting message from client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ============ PUSH NOTIFICATION HANDLER ============
self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: "Talish",
      body: event.data?.text() || "New notification",
    };
  }

  const title = data.title || "Talish";
  const options = {
    body: data.body || "You have a new notification",
    icon: data.icon || "/pwa-192x192.png",
    badge: data.badge || "/pwa-192x192.png",
    tag: data.tag || "talish-notification",
    data: data.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ============ NOTIFICATION CLICK HANDLER ============
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      }),
  );
});

// ============ LIFECYCLE ============
self.addEventListener("install", (event) => {
  // 🔥 Don't auto-skip - let user choose when to update
  console.log("📦 New service worker installed, waiting for user action");
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
