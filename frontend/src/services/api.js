import axios from "axios";

// Base URL for the backend API
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "/api";

// Create Axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("talish_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((response) => response, (error) => {
  const url = error.config?.url || "";
  if (error.response?.status === 401 && localStorage.getItem("talish_token") && !/auth\/(login|register)|chats\/.*\/(unlock|lock|remove-lock)/.test(url)) {
    window.dispatchEvent(new Event("talish:session-expired"));
  }
  return Promise.reject(error);
});

// ---- API ENDPOINTS ----

// Auth endpoints
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

// User endpoints
export const userAPI = {
  search: (query, config) => api.get("/users/search", { ...config, params: { q: query } }),
  getProfile: (username) => api.get(`/users/profile/${encodeURIComponent(username)}`),
  updateProfile: (data) => api.put("/users/profile", data),
  // Block / Unblock
  block: (userId) => api.post(`/users/block/${userId}`),
  unblock: (userId) => api.post(`/users/unblock/${userId}`),
  getBlocked: () => api.get("/users/blocked"),
  // Avatar upload
  uploadAvatar: (formData, onProgress, config) =>
    api.post("/users/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        const percent = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || progressEvent.loaded || 1));
        if (onProgress) onProgress(percent);
      }, ...config,
    }),
};

// Friend endpoints
export const friendAPI = {
  sendRequest: (data) => api.post("/friends/request", data),
  getRequests: (config) => api.get("/friends/requests", config),
  respond: (data) => api.put("/friends/respond", data),
  getList: (config) => api.get("/friends/list", config),
  removeFriend: (friendId) => api.delete(`/friends/${friendId}`),
  cancelRequest: (requestId) => api.delete(`/friends/request/${requestId}`),
};

// Chat endpoints
export const chatAPI = {
  getAll: (config) => api.get("/chats", config),
  create: (data) => api.post("/chats/create", data),
  clearChat: (chatId) => api.put(`/chats/${chatId}/clear`),
  setDisappearing: (chatId, data) =>
    api.put(`/chats/${chatId}/disappearing`, data),

  // Chat actions
  togglePin: (chatId) => api.put(`/chats/${chatId}/pin`),
  toggleMute: (chatId) => api.put(`/chats/${chatId}/mute`),
  toggleMarkUnread: (chatId) => api.put(`/chats/${chatId}/mark-unread`),
  deleteChat: (chatId) => api.delete(`/chats/${chatId}`),

  // Chat lock
  lock: (chatId, pin) => api.put(`/chats/${chatId}/lock`, { pin }),
  unlock: (chatId, pin) => api.put(`/chats/${chatId}/unlock`, { pin }),
  removeLock: (chatId, pin) => api.put(`/chats/${chatId}/remove-lock`, { pin }),
  getLockedChats: () => api.get("/chats/locked"),
};

// Message endpoints
export const messageAPI = {
  get: (chatId, params, config) => api.get(`/messages/${chatId}`, { ...config, params }),
  send: (data) => api.post("/messages/send", data),
  sendMedia: (formData, onProgress, config) =>
    api.post("/messages/send-media", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        const percent = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || progressEvent.loaded || 1));
        if (onProgress) onProgress(percent);
      }, ...config,
    }),
  edit: (messageId, content) =>
    api.put(`/messages/${messageId}/edit`, { content }),
  markSeen: (chatId) => api.put(`/messages/${chatId}/seen`),
  deleteForMe: (messageId) => api.delete(`/messages/${messageId}/me`),
  deleteForEveryone: (messageId) =>
    api.delete(`/messages/${messageId}/everyone`),
  // Bulk delete
  bulkDeleteForMe: (messageIds) =>
    api.post("/messages/bulk-delete-me", { messageIds }),
  bulkDeleteForEveryone: (messageIds) =>
    api.post("/messages/bulk-delete-everyone", { messageIds }),
  search: (params) => api.get("/messages/search", { params }),

  //  NEW: Leave cleanup for Option A disappearing messages
  leaveCleanup: (chatId) => api.post(`/messages/${chatId}/leave-cleanup`),
};

//  Push Notification endpoints
export const pushAPI = {
  getVapidKey: () => api.get("/push/vapid-key"),
  subscribe: (subscription) => api.post("/push/subscribe", { subscription }),
  unsubscribe: (endpoint) => api.post("/push/unsubscribe", { endpoint }),
};

export default api;
