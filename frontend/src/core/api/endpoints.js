/**
 * A single, exhaustive description of the Talish Talks backend contract.
 *
 * Keeping every path in one module means a backend route change is a one-file
 * edit, and it gives every call site a named, intention-revealing function
 * instead of a raw string.
 */

import { del, get, post, put } from "./http.js";

/* ------------------------------------------------------------------- auth -- */

export const authApi = {
  /** POST /api/auth/register */
  register: (payload) => post("/auth/register", payload),

  /** POST /api/auth/login */
  login: (payload) => post("/auth/login", payload),

  /** GET /api/auth/me */
  me: () => get("/auth/me"),

  /** POST /api/auth/logout */
  logout: () => post("/auth/logout"),

  /** GET /api/auth/check-username/:username */
  checkUsername: (username) => get(`/auth/check-username/${encodeURIComponent(username)}`),
};

/* ------------------------------------------------------------------ users -- */

export const userApi = {
  /** GET /api/users/search?q= */
  search: (query) => get("/users/search", { params: { q: query } }),

  /** GET /api/users/profile/:username */
  profile: (username) => get(`/users/profile/${encodeURIComponent(username)}`),

  /** PUT /api/users/profile */
  updateProfile: (payload) => put("/users/profile", payload),

  /** POST /api/users/avatar (multipart) */
  uploadAvatar: (file) => {
    const body = new FormData();
    body.append("avatar", file);
    return post("/users/avatar", body, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /** POST /api/users/block/:userId */
  block: (userId) => post(`/users/block/${userId}`),

  /** POST /api/users/unblock/:userId */
  unblock: (userId) => post(`/users/unblock/${userId}`),

  /** GET /api/users/blocked */
  blocked: () => get("/users/blocked"),
};

/* ---------------------------------------------------------------- friends -- */

export const friendApi = {
  /** POST /api/friends/request - the server identifies the receiver by username. */
  sendRequest: (username) => post("/friends/request", { username }),

  /** GET /api/friends/requests */
  requests: () => get("/friends/requests"),

  /** PUT /api/friends/respond - action is "accept" or "reject". */
  respond: (requestId, action) => put("/friends/respond", { requestId, action }),

  /** GET /api/friends/list */
  list: () => get("/friends/list"),

  /** DELETE /api/friends/request/:requestId */
  cancelRequest: (requestId) => del(`/friends/request/${requestId}`),

  /** DELETE /api/friends/:friendId */
  removeFriend: (friendId) => del(`/friends/${friendId}`),
};

/* ---------------------------------------------------------------- stories -- */

export const storyApi = {
  /** GET /api/stories - active stories from the signed-in user and friends. */
  list: () => get("/stories"),

  /** POST /api/stories - text and optional multipart image. */
  create: ({ text, image }) => {
    const body = new FormData();
    if (text) body.append("text", text);
    if (image) body.append("image", image);
    return post("/stories", body, { headers: { "Content-Type": "multipart/form-data" } });
  },

  /** POST /api/stories/:storyId/view */
  markViewed: (storyId) => post(`/stories/${storyId}/view`),

  /** DELETE /api/stories/:storyId */
  remove: (storyId) => del(`/stories/${storyId}`),
};

/* ------------------------------------------------------------------ chats -- */

export const chatApi = {
  /** GET /api/chats */
  list: () => get("/chats"),

  /** GET /api/chats/locked */
  locked: () => get("/chats/locked"),

  /** POST /api/chats/create */
  create: (friendId) => post("/chats/create", { friendId }),

  /** PUT /api/chats/:chatId/clear */
  clear: (chatId) => put(`/chats/${chatId}/clear`),

  /** PUT /api/chats/:chatId/disappearing */
  setDisappearing: (chatId, mode) => put(`/chats/${chatId}/disappearing`, { mode }),

  /** PUT /api/chats/:chatId/pin */
  pin: (chatId) => put(`/chats/${chatId}/pin`),

  /** PUT /api/chats/:chatId/mute */
  mute: (chatId) => put(`/chats/${chatId}/mute`),

  /** PUT /api/chats/:chatId/mark-unread */
  markUnread: (chatId) => put(`/chats/${chatId}/mark-unread`),

  /** DELETE /api/chats/:chatId */
  remove: (chatId) => del(`/chats/${chatId}`),
};

/* --------------------------------------------------------------- messages -- */

export const messageApi = {
  /** GET /api/messages/:chatId?page=&limit=&before= */
  history: (chatId, { page = 1, limit = 50, before } = {}) =>
    get(`/messages/${chatId}`, {
      params: { page, limit, ...(before ? { before } : {}) },
    }),

  /** POST /api/messages/send */
  send: (payload) => post("/messages/send", payload),

  /** POST /api/messages/send-media (multipart) */
  sendMedia: ({ chatId, file, clientId, replyTo }) => {
    const body = new FormData();
    body.append("chatId", chatId);
    if (clientId) body.append("clientId", clientId);
    if (replyTo) body.append("replyTo", replyTo);
    body.append("file", file);
    return post("/messages/send-media", body, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /** PUT /api/messages/:messageId/edit */
  edit: (messageId, content) => put(`/messages/${messageId}/edit`, { content }),

  /** PUT /api/messages/:chatId/seen */
  markSeen: (chatId) => put(`/messages/${chatId}/seen`),

  /** DELETE /api/messages/:messageId/me */
  deleteForMe: (messageId) => del(`/messages/${messageId}/me`),

  /** DELETE /api/messages/:messageId/everyone */
  deleteForEveryone: (messageId) => del(`/messages/${messageId}/everyone`),

  /** GET /api/messages/search?q=&chatId= */
  search: (query, chatId) => get("/messages/search", { params: { q: query, ...(chatId ? { chatId } : {}) } }),
};

/* ------------------------------------------------------------------- push -- */

export const pushApi = {
  /** GET /api/push/vapid-key */
  vapidKey: () => get("/push/vapid-key"),

  /** POST /api/push/subscribe - the body is wrapped in a `subscription` property. */
  subscribe: (subscription) => post("/push/subscribe", { subscription }),

  /** POST /api/push/unsubscribe - the body carries the subscription endpoint. */
  unsubscribe: (endpoint) => post("/push/unsubscribe", { endpoint }),
};

export default {
  auth: authApi,
  users: userApi,
  friends: friendApi,
  stories: storyApi,
  chats: chatApi,
  messages: messageApi,
  push: pushApi,
};
