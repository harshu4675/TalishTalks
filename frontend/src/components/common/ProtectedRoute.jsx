import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import LoadingScreen from "./LoadingScreen";
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/auth" replace state={{ from: location.pathname }} />;
};
export default ProtectedRoute;
