/**
 * Route guards.
 *
 * `RequireAuth` keeps unauthenticated visitors on the sign-in screen and
 * `RedirectIfAuthed` keeps signed-in users out of the auth screens.
 */

import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../core/auth/useAuth.js";
import { Spinner } from "../shared/components/Feedback.jsx";

/**
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 */
export function RequireAuth({ children }) {
  const { isAuthenticated, isInitialising } = useAuth();
  const location = useLocation();

  if (isInitialising) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "var(--surface-canvas)",
        }}
      >
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  return children;
}

/**
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 */
export function RedirectIfAuthed({ children }) {
  const { isAuthenticated, isInitialising } = useAuth();
  const location = useLocation();

  if (isInitialising) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "var(--surface-canvas)",
        }}
      >
        <Spinner />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={location.state?.from || "/"} replace />;
  }

  return children;
}
