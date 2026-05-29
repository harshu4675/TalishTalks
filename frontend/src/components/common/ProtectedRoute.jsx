import React from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import TalishLogo from "../../assets/logo";

// Inline loading component (lighter than full screen loader)
const AuthLoadingState = () => (
  <div className="min-h-screen bg-dark flex flex-col items-center justify-center">
    <motion.div
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <TalishLogo size="lg" />
    </motion.div>
    <div className="mt-6 flex items-center gap-2 text-gray-soft text-sm">
      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <span>Verifying session...</span>
    </div>
  </div>
);

// Protected Route - redirects to login if not authenticated
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return <AuthLoadingState />;
  }

  // Redirect to auth page if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // User is authenticated, render children
  return children;
};

export default ProtectedRoute;
