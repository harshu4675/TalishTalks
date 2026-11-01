import React, { createContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "../services/api";
import { errorMessage } from "../utils/messages";
export const AuthContext = createContext(null);
const clearStoredSession = () => { localStorage.removeItem("talish_token"); localStorage.removeItem("talish_user"); };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const checkAuth = useCallback(async () => {
    setLoading(true);
    if (!localStorage.getItem("talish_token")) { setLoading(false); return; }
    try { const response = await authAPI.getMe(); setUser(response.data.user); setError(null); }
    catch (failure) {
      if (failure.response?.status === 401) { clearStoredSession(); setUser(null); }
      else setError(errorMessage(failure, "Could not verify your session."));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void checkAuth(); }, [checkAuth]);
  useEffect(() => {
    const expire = () => { clearStoredSession(); setUser(null); };
    const storage = (event) => { if (event.key === "talish_token" && !event.newValue) expire(); };
    window.addEventListener("talish:session-expired", expire);
    window.addEventListener("storage", storage);
    return () => { window.removeEventListener("talish:session-expired", expire); window.removeEventListener("storage", storage); };
  }, []);
  const authenticate = async (method, data) => {
    setError(null);
    try {
      const response = await authAPI[method](data);
      localStorage.setItem("talish_token", response.data.token);
      localStorage.setItem("talish_user", JSON.stringify(response.data.user));
      setUser(response.data.user);
      return { success: true };
    } catch (failure) { const message = errorMessage(failure, "Authentication failed. Please try again."); setError(message); return { success: false, message }; }
  };
  const logout = async () => {
    try { await authAPI.logout(); }
    catch { /* Local credentials must still be removed if the network is unavailable. */ }
    finally { clearStoredSession(); setUser(null); }
  };
  const updateUser = (data) => setUser((previous) => {
    const next = { ...previous, ...data };
    localStorage.setItem("talish_user", JSON.stringify(next));
    return next;
  });
  return <AuthContext.Provider value={{ user, loading, error, register: (data) => authenticate("register", data), login: (data) => authenticate("login", data), logout, updateUser, clearError: () => setError(null), checkAuth }}>{children}</AuthContext.Provider>;
};
export default AuthProvider;
