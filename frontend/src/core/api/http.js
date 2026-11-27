/**
 * The HTTP transport for the whole application.
 *
 * Responsibilities:
 *  - attach the bearer token to every outgoing request;
 *  - normalise transport, HTTP and application errors into a single
 *    `ApiError` shape so that UI code never has to reason about Axios;
 *  - broadcast an "unauthorised" signal when the server rejects the session,
 *    which lets the auth layer log the user out exactly once.
 */

import axios from "axios";
import config from "../config.js";

/** Emitted whenever the server answers 401 so the session can be torn down. */
export const UNAUTHORIZED_EVENT = "talish:unauthorized";

const listeners = new Set();

/** Subscribe to server-side session rejections. Returns an unsubscribe fn. */
export const onUnauthorized = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const emitUnauthorized = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* a misbehaving listener must never break the transport */
    }
  });
};

/**
 * A transport-agnostic error. Every failure surfaced by the API layer is an
 * instance of this class, which keeps error handling in the UI declarative.
 */
export class ApiError extends Error {
  constructor({ message, status = 0, code = "unknown", fieldErrors = null, cause = null } = {}) {
    super(message || "Something went wrong. Please try again.");
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    if (cause) this.cause = cause;
  }

  /** True when the request never reached the server (offline, DNS, CORS). */
  get isNetworkError() {
    return this.code === "network";
  }

  /** True when the session is missing, expired or rejected. */
  get isUnauthorized() {
    return this.status === 401;
  }

  /** True when the server rejected the request as invalid. */
  get isValidationError() {
    return this.status === 400 || this.status === 422;
  }

  /** True when the caller is authenticated but not allowed to do this. */
  get isForbidden() {
    return this.status === 403;
  }

  /** True when the requested resource no longer exists. */
  get isNotFound() {
    return this.status === 404;
  }

  /** True when the server asked the client to back off (rate limiting). */
  get isRateLimited() {
    return this.status === 429;
  }
}

/** Extract a human readable message from an arbitrary server payload. */
const extractMessage = (payload, fallback) => {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
  if (Array.isArray(payload.errors) && payload.errors.length) {
    const [first] = payload.errors;
    if (typeof first === "string") return first;
    if (first && typeof first.msg === "string") return first.msg;
  }
  return fallback;
};

/** Map a field name to the message the server produced for it. */
const extractFieldErrors = (payload) => {
  if (!payload || !Array.isArray(payload.errors)) return null;
  const fields = {};
  for (const entry of payload.errors) {
    const field = entry?.param || entry?.path || entry?.field;
    if (field && !fields[field]) fields[field] = entry.msg;
  }
  return Object.keys(fields).length ? fields : null;
};

export const http = axios.create({
  baseURL: config.apiBaseUrl || undefined,
  timeout: 20000,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

/* ------------------------------------------------------------- interceptors */

http.interceptors.request.use((request) => {
  // Imported lazily to avoid a circular dependency between the transport and
  // the session store.
  const { getToken } = requestTokenProvider;
  const token = getToken();
  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }
  return request;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const response = error?.response;

    if (!response) {
      const isCanceled = axios.isCancel?.(error) || error?.code === "ERR_CANCELED";
      if (isCanceled) {
        return Promise.reject(
          new ApiError({ message: "Request cancelled", code: "cancelled" }),
        );
      }
      return Promise.reject(
        new ApiError({
          message:
            "Unable to reach the Talish Talks server. Check your connection and try again.",
          code: "network",
          cause: error,
        }),
      );
    }

    const { status } = response;
    const payload = response.data;
    const message = extractMessage(
      payload,
      status === 401
        ? "Your session has expired. Please sign in again."
        : status === 403
          ? "You do not have permission to perform this action."
          : status === 404
            ? "The requested resource could not be found."
            : status === 429
              ? "Too many requests. Please slow down and try again shortly."
              : "The server ran into a problem. Please try again.",
    );

    if (status === 401) emitUnauthorized();

    return Promise.reject(
      new ApiError({
        message,
        status,
        code: `http_${status}`,
        fieldErrors: extractFieldErrors(payload),
        cause: error,
      }),
    );
  },
);

/* ------------------------------------------------------- token plumbing ---- */

/**
 * The token provider is injected by the auth layer during boot. Keeping it
 * behind a tiny indirection avoids an import cycle between the transport and
 * the session store while still allowing the transport to read the token.
 */
export const requestTokenProvider = {
  getToken: () => null,
  setTokenReader: (reader) => {
    requestTokenProvider.getToken = reader;
  },
};

/* ------------------------------------------------------------- utilities -- */

/**
 * Perform a request and unwrap the JSON body. Errors propagate as `ApiError`.
 */
export const request = async (options) => {
  const response = await http.request(options);
  return response.data;
};

/** GET helper. */
export const get = (url, config) => request({ method: "get", url, ...config });

/** POST helper. */
export const post = (url, data, config) =>
  request({ method: "post", url, data, ...config });

/** PUT helper. */
export const put = (url, data, config) =>
  request({ method: "put", url, data, ...config });

/** PATCH helper. */
export const patch = (url, data, config) =>
  request({ method: "patch", url, data, ...config });

/** DELETE helper. */
export const del = (url, config) => request({ method: "delete", url, ...config });

export default http;
