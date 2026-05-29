import React, { createContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "../services/api";

// Create Auth Context
export const AuthContext = createContext(null);

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in (on app load)
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem("talish_token");

      if (!token) {
        setLoading(false);
        return;
      }

      // Verify token with backend
      const response = await authAPI.getMe();

      if (response.data.success) {
        setUser(response.data.user);
      } else {
        // Token is invalid, clear it
        localStorage.removeItem("talish_token");
        localStorage.removeItem("talish_user");
      }
    } catch (err) {
      console.error("Auth check failed:", err.message);
      localStorage.removeItem("talish_token");
      localStorage.removeItem("talish_user");
    } finally {
      setLoading(false);
    }
  }, []);

  // Run auth check on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Register function
  const register = async (userData) => {
    try {
      setError(null);
      const response = await authAPI.register(userData);

      if (response.data.success) {
        const { user: newUser, token } = response.data;
        localStorage.setItem("talish_token", token);
        localStorage.setItem("talish_user", JSON.stringify(newUser));
        setUser(newUser);
        return { success: true };
      }
    } catch (err) {
      const message =
        err.response?.data?.message || "Registration failed. Please try again.";
      setError(message);
      return { success: false, message };
    }
  };

  // Login function
  const login = async (credentials) => {
    try {
      setError(null);
      const response = await authAPI.login(credentials);

      if (response.data.success) {
        const { user: loggedUser, token } = response.data;
        localStorage.setItem("talish_token", token);
        localStorage.setItem("talish_user", JSON.stringify(loggedUser));
        setUser(loggedUser);
        return { success: true };
      }
    } catch (err) {
      const message =
        err.response?.data?.message || "Login failed. Please try again.";
      setError(message);
      return { success: false, message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error("Logout API error:", err.message);
    } finally {
      localStorage.removeItem("talish_token");
      localStorage.removeItem("talish_user");
      setUser(null);
    }
  };

  // Update user data locally
  const updateUser = (updatedData) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
    const stored = JSON.parse(localStorage.getItem("talish_user") || "{}");
    localStorage.setItem(
      "talish_user",
      JSON.stringify({ ...stored, ...updatedData }),
    );
  };

  // Clear error
  const clearError = () => setError(null);

  // Context value
  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    updateUser,
    clearError,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
