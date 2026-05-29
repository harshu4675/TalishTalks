import axios from "axios";

// Base URL for the backend API
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create Axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Send cookies with requests
});

// ---- REQUEST INTERCEPTOR ----
// Automatically attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("talish_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// ---- RESPONSE INTERCEPTOR ----
// Handle common response errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - token expired or invalid
          console.warn("🔒 Unauthorized - Clearing token");
          localStorage.removeItem("talish_token");
          localStorage.removeItem("talish_user");
          // Only redirect if not already on auth page
          if (window.location.pathname !== "/auth") {
            window.location.href = "/auth";
          }
          break;

        case 403:
          console.warn("🚫 Forbidden");
          break;

        case 404:
          console.warn("❓ Not found");
          break;

        case 429:
          console.warn("⏳ Too many requests");
          break;

        case 500:
          console.error("💥 Server error");
          break;

        default:
          console.error(`Error ${status}:`, data?.message);
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error("🌐 Network error - No response from server");
    } else {
      // Something else happened
      console.error("❌ Error:", error.message);
    }

    return Promise.reject(error);
  },
);

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
  search: (query) => api.get(`/users/search?q=${query}`),
  getProfile: (username) => api.get(`/users/profile/${username}`),
  updateProfile: (data) => api.put("/users/profile", data),
};

// Friend endpoints
export const friendAPI = {
  sendRequest: (data) => api.post("/friends/request", data),
  getRequests: () => api.get("/friends/requests"),
  respond: (data) => api.put("/friends/respond", data),
  getList: () => api.get("/friends/list"),
  removeFriend: (friendId) => api.delete(`/friends/${friendId}`),
  cancelRequest: (requestId) => api.delete(`/friends/request/${requestId}`),
};

// Chat endpoints
export const chatAPI = {
  getAll: () => api.get("/chats"),
  create: (data) => api.post("/chats/create", data),
  clearChat: (chatId) => api.put(`/chats/${chatId}/clear`),
  setDisappearing: (chatId, data) =>
    api.put(`/chats/${chatId}/disappearing`, data),
};

// Message endpoints
export const messageAPI = {
  get: (chatId, params) => api.get(`/messages/${chatId}`, { params }),
  send: (data) => api.post("/messages/send", data),
  markSeen: (chatId) => api.put(`/messages/${chatId}/seen`),
  deleteForMe: (messageId) => api.delete(`/messages/${messageId}/me`),
  deleteForEveryone: (messageId) =>
    api.delete(`/messages/${messageId}/everyone`),
  search: (params) => api.get("/messages/search", { params }),
};
export default api;
