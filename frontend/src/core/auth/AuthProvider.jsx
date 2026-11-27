/**
 * The authentication provider.
 *
 * Owns the single source of truth for "who is signed in" and exposes the
 * imperative operations the UI needs. It also bootstraps the HTTP transport
 * with the token reader so every request is authenticated automatically.
 */

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { onUnauthorized, requestTokenProvider } from "../api/http.js";
import {
  abandonSession,
  fetchProfile,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from "./authService.js";
import { hasStoredToken, readToken, writeUser } from "./session.js";

/**
 * @typedef {"initialising" | "authenticated" | "unauthenticated"} AuthStatus
 */

const AuthContext = createContext(null);

/** Create the provider. Wrap the application once, at the root. */
export function AuthProvider({ children }) {
  const [status, setStatus] = useState(
    () => (hasStoredToken() ? "initialising" : "unauthenticated"),
  );
  const [user, setUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Guards against setting state after the provider unmounts.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Teach the transport how to read the current bearer token.
  useEffect(() => {
    requestTokenProvider.setTokenReader(readToken);
    return () => requestTokenProvider.setTokenReader(() => null);
  }, []);

  /** Apply a server-issued session and move to the authenticated state. */
  const adoptSession = useCallback((nextUser) => {
    if (!mounted.current) return;
    setUser(nextUser);
    setStatus("authenticated");
    setError(null);
  }, []);

  /** Drop the session and move to the unauthenticated state. */
  const discardSession = useCallback(() => {
    if (!mounted.current) return;
    abandonSession();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  /* --------------------------------------------------- session restoration */
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      if (!hasStoredToken()) {
        if (!cancelled) setStatus("unauthenticated");
        return;
      }

      try {
        const profile = await fetchProfile();
        if (cancelled) return;
        adoptSession(profile);
      } catch {
        // The token is no longer usable - clear it and show the sign-in screen.
        if (cancelled) return;
        abandonSession();
        setUser(null);
        setStatus("unauthenticated");
      }
    };

    restore();
    return () => {
      cancelled = true;
    };
  }, [adoptSession]);

  /* ------------------------------------------------- server-side rejection */
  useEffect(() => {
    return onUnauthorized(() => {
      // A 401 anywhere in the app means the session is gone. Tear it down once.
      discardSession();
    });
  }, [discardSession]);

  /* --------------------------------------------------------------- actions */

  const register = useCallback(
    async (payload) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const { user: nextUser, message } = await registerRequest(payload);
        adoptSession(nextUser);
        return { user: nextUser, message };
      } catch (caught) {
        if (mounted.current) setError(caught);
        throw caught;
      } finally {
        if (mounted.current) setIsSubmitting(false);
      }
    },
    [adoptSession],
  );

  const login = useCallback(
    async (payload) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const { user: nextUser, message } = await loginRequest(payload);
        adoptSession(nextUser);
        return { user: nextUser, message };
      } catch (caught) {
        if (mounted.current) setError(caught);
        throw caught;
      } finally {
        if (mounted.current) setIsSubmitting(false);
      }
    },
    [adoptSession],
  );

  const logout = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await logoutRequest();
    } finally {
      discardSession();
      if (mounted.current) setIsSubmitting(false);
    }
  }, [discardSession]);

  /** Merge a partial profile update into the session and persist it. */
  const updateUser = useCallback((patch) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      writeUser(next);
      return next;
    });
  }, []);

  /** Replace the whole profile (used after a profile refresh). */
  const setProfile = useCallback((nextUser) => {
    if (!nextUser) return;
    setUser(nextUser);
    writeUser(nextUser);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      status,
      user,
      error,
      isSubmitting,
      isAuthenticated: status === "authenticated",
      isInitialising: status === "initialising",
      register,
      login,
      logout,
      updateUser,
      setProfile,
      clearError,
    }),
    [status, user, error, isSubmitting, register, login, logout, updateUser, setProfile, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
export default AuthProvider;
