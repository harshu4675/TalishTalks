/*
 * Talish Talks - service worker
 * ---------------------------------------------------------------------------
 * Precaches the application shell so the app opens instantly and keeps
 * working on a flaky connection.
 *
 * Two things are deliberately never cached:
 *   - `/api/*`      API responses must always come from the server.
 *   - `/socket.io`  the realtime transport must never be intercepted.
 */

import { clientsClaim } from "workbox-core";
import {
  cleanupOutdatedCaches,
  matchPrecache,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

/**
 * Bypass the cache entirely for live traffic so a stale response can never
 * break authentication or messaging.
 */
const isLiveRequest = (url) =>
  url.pathname.startsWith("/api") ||
  url.pathname.startsWith("/socket.io") ||
  url.pathname.startsWith("/socket.io/");

/**
 * Navigations are served from the network when possible and fall back to the
 * precached application shell when the device is offline.
 */
registerRoute(
  new NavigationRoute(
    async ({ request }) => {
      try {
        return await fetch(request);
      } catch {
        const shell = await matchPrecache("/index.html");
        return shell ?? Response.error();
      }
    },
    {
      denylist: [/^\/api\//, /^\/socket\.io\//],
    },
  ),
);

/**
 * Live traffic is never served from a cache.
 */
registerRoute(
  ({ url }) => isLiveRequest(url),
  async ({ request }) => fetch(request),
  "GET",
);
