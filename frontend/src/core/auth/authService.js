/**
 * Authentication service.
 *
 * Wraps the raw endpoint functions with the session side effects that must
 * always accompany them: storing the token on success, clearing it on
 * failure. The React layer above never touches storage directly.
 */

import { authApi } from "../api/endpoints.js";
import { ApiError } from "../api/http.js";
import { clearSession, readToken, writeSession } from "./session.js";

/**
 * Normalise the user object returned by the server. The API returns different
 * projections for `/register`, `/login` and `/me`; the UI wants one shape.
 */
export const normalizeUser = (user) => {
  if (!user) return null;
  return {
    _id: user._id,
    fullName: user.fullName || "",
    username: user.username || "",
    email: user.email || "",
    avatar: user.avatar || "",
    about: user.about || "",
    isOnline: Boolean(user.isOnline),
    lastSeen: user.lastSeen || null,
    friends: Array.isArray(user.friends) ? user.friends : [],
    lockedChats: Array.isArray(user.lockedChats) ? user.lockedChats : [],
    createdAt: user.createdAt || null,
  };
};

/**
 * Register a new account.
 * @throws {ApiError} when the server rejects the payload.
 */
export const register = async ({ fullName, username, email, password }) => {
  const payload = {
    fullName: fullName.trim(),
    username: username.trim().toLowerCase(),
    email: email.trim().toLowerCase(),
    password,
  };

  const data = await authApi.register(payload);
  const user = normalizeUser(data.user);
  writeSession({ token: data.token, user });
  return { user, token: data.token, message: data.message };
};

/**
 * Sign in with an email or username.
 * @throws {ApiError} when the credentials are invalid.
 */
export const login = async ({ identifier, password }) => {
  const data = await authApi.login({ identifier: identifier.trim(), password });
  const user = normalizeUser(data.user);
  writeSession({ token: data.token, user });
  return { user, token: data.token, message: data.message };
};

/**
 * Fetch the authoritative profile for the current session.
 * @throws {ApiError} when the token is missing, expired or rejected.
 */
export const fetchProfile = async () => {
  const data = await authApi.me();
  const user = normalizeUser(data.user);
  writeSession({ token: readToken(), user });
  return user;
};

/**
 * Sign out. The local session is always cleared, even if the network call
 * fails, so a user on a flaky connection is never stuck in a signed-in shell.
 */
export const logout = async () => {
  try {
    await authApi.logout();
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    /* The server may not know about this session; local state must still go. */
  } finally {
    clearSession();
  }
};

/** Drop the local session without contacting the server. */
export const abandonSession = () => {
  clearSession();
};

/** Ask the server whether a username is available. */
export const checkUsername = async (username) => {
  const data = await authApi.checkUsername(username);
  return Boolean(data?.available ?? data?.success);
};
