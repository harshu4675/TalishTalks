import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../core/auth/useAuth.js";
import { LoadingScreen } from "../shared/components/Feedback.jsx";

export function RequireAuth({ children }) {
  const { isAuthenticated, isInitialising } = useAuth();
  const location = useLocation();
  if (isInitialising) return <LoadingScreen label="Restoring your session" />;
  if (!isAuthenticated) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  return children;
}

export function RedirectIfAuthed({ children }) {
  const { isAuthenticated, isInitialising } = useAuth();
  const location = useLocation();
  if (isInitialising) return <LoadingScreen label="Restoring your session" />;
  if (isAuthenticated) return <Navigate to={location.state?.from || "/"} replace />;
  return children;
}
