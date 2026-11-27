/**
 * Runtime configuration for the Talish Talks frontend.
 *
 * Every environment-dependent value is resolved exactly once, here, so that
 * the rest of the application never reads `import.meta.env` directly. The
 * values are validated at boot: a misconfigured API URL should fail loudly and
 * immediately rather than surface as a mysterious network error much later.
 */

/**
 * Strip trailing slashes so that `${base}/auth/login` never produces a double
 * slash. An empty or whitespace-only value collapses to an empty string, which
 * callers interpret as "same origin" (proxy mode).
 */
const normalizeBase = (value) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
};

/**
 * Parse a URL that may be relative ("/api") or absolute ("https://host/api").
 * Throws a descriptive error when the value cannot be understood, because a
 * silently broken base URL is the single most common cause of a chat client
 * that "loads" but can never talk to its server.
 */
const parseApiUrl = (raw) => {
  const base = normalizeBase(raw);
  // An empty value means "same origin": requests go to /api and the dev
  // server (or the reverse proxy in production) forwards them.
  if (!base) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return { baseUrl: "/api", origin };
  }

  if (base.startsWith("/")) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return { baseUrl: base, origin };
  }

  let parsed;
  try {
    parsed = new URL(base);
  } catch {
    throw new Error(
      `Invalid VITE_API_URL "${base}". Use an absolute URL (https://host/api) or a root-relative path (/api).`,
    );
  }

  if (!parsed.hostname) {
    throw new Error(
      `Invalid VITE_API_URL "${base}". The URL is missing a hostname.`,
    );
  }

  return { baseUrl: base, origin: parsed.origin };
};

const readBoolean = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const readNumber = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const env = import.meta.env ?? {};

const api = parseApiUrl(env.VITE_API_URL);

/**
 * Socket.IO connects to an origin, not to a path-prefixed API base. When the
 * API base is absolute we reuse its origin; in proxy mode the browser's own
 * origin is correct because Vite proxies `/socket.io` as well.
 */
const socketOrigin = (() => {
  const explicit = normalizeBase(env.VITE_SOCKET_URL);
  if (explicit) {
    try {
      return new URL(explicit).origin;
    } catch {
      throw new Error(
        `Invalid VITE_SOCKET_URL "${explicit}". Use an absolute origin such as https://talish.example.com.`,
      );
    }
  }
  if (api.origin) return api.origin;
  return typeof window !== "undefined" ? window.location.origin : "";
})();

export const config = Object.freeze({
  /** Absolute or root-relative base path for REST calls. */
  apiBaseUrl: api.baseUrl,
  /** Origin used for Socket.IO handshakes. */
  socketOrigin,
  /** Human readable product name, used in titles and notifications. */
  appName: env.VITE_APP_NAME || "Talish Talks",
  /** Maximum characters accepted by the composer (mirrors the server limit). */
  maxMessageLength: readNumber(env.VITE_MAX_MESSAGE_LENGTH, 5000),
  /** Debounce window for search-as-you-type requests. */
  searchDebounceMs: readNumber(env.VITE_SEARCH_DEBOUNCE_MS, 300),
  /** Whether the UI advertises browser push notifications. */
  pushEnabled: readBoolean(env.VITE_ENABLE_PUSH_NOTIFICATIONS, true),
  /** Whether the service worker / offline shell is enabled. */
  offlineEnabled: readBoolean(env.VITE_ENABLE_OFFLINE_MODE, true),
});

export default config;
