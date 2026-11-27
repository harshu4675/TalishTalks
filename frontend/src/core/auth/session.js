/**
 * Session persistence.
 *
 * The token and the user profile are stored separately so that a stale profile
 * can never masquerade as a live session: the token is the source of truth for
 * "am I signed in", and the profile is only a cache for first paint.
 */

const TOKEN_KEY = "talish.token";
const USER_KEY = "talish.user";

const isBrowser = typeof window !== "undefined" && !!window.localStorage;

const safeParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

/** Read the persisted bearer token (or null). */
export const readToken = () => {
  if (!isBrowser) return null;
  const token = window.localStorage.getItem(TOKEN_KEY);
  return token && token.trim() ? token : null;
};

/** Persist the bearer token. Passing null clears it. */
export const writeToken = (token) => {
  if (!isBrowser) return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
};

/** Read the cached user profile (or null). */
export const readUser = () => {
  if (!isBrowser) return null;
  const raw = window.localStorage.getItem(USER_KEY);
  return raw ? safeParse(raw) : null;
};

/** Persist the cached user profile. Passing null clears it. */
export const writeUser = (user) => {
  if (!isBrowser) return;
  if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(USER_KEY);
};

/** Atomically replace the persisted session. */
export const writeSession = ({ token, user }) => {
  writeToken(token);
  writeUser(user);
};

/** Remove every trace of the session from this device. */
export const clearSession = () => {
  writeToken(null);
  writeUser(null);
};

/** True when a token is present in storage. */
export const hasStoredToken = () => Boolean(readToken());
