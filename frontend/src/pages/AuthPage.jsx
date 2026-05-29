import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import TalishLogo from "../assets/logo";
import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";
import { useAuth } from "../hooks/useAuth";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Redirect to home if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Animated background orbs */}
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -80, 0],
          y: [0, 80, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-0 left-0 w-80 h-80 bg-accent-amber/10 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, 60, 0],
          y: [0, 40, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-1/2 left-1/4 w-72 h-72 bg-brown-deep/30 rounded-full blur-3xl pointer-events-none"
      />

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex justify-center mb-8"
        >
          <TalishLogo size="lg" />
        </motion.div>

        {/* Welcome Text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-center mb-6"
        >
          <h1 className="text-2xl font-display font-bold text-offwhite mb-1">
            {isLogin ? "Welcome Back 👋" : "Join the Vibe ✨"}
          </h1>
          <p className="text-sm text-gray-soft">
            {isLogin
              ? "Login to continue your conversations"
              : "Create an account to start chatting"}
          </p>
        </motion.div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="glass rounded-2xl p-6 sm:p-8 shadow-card"
        >
          {/* Toggle Tabs */}
          <div className="flex bg-dark-100 rounded-xl p-1 mb-6 relative">
            {/* Animated background slider */}
            <motion.div
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-accent rounded-lg shadow-glow"
              animate={{ left: isLogin ? "4px" : "calc(50% + 0px)" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />

            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium relative z-10 transition-colors duration-300 ${
                isLogin ? "text-white" : "text-gray-soft hover:text-offwhite"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium relative z-10 transition-colors duration-300 ${
                !isLogin ? "text-white" : "text-gray-soft hover:text-offwhite"
              }`}
            >
              Register
            </button>
          </div>

          {/* Form (with animated transitions) */}
          <AnimatePresence mode="wait">
            {isLogin ? (
              <LoginForm
                key="login"
                onSwitchToRegister={() => setIsLogin(false)}
              />
            ) : (
              <RegisterForm
                key="register"
                onSwitchToLogin={() => setIsLogin(true)}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="text-center mt-6"
        >
          <p className="text-xs text-gray-soft/50 flex items-center justify-center gap-1.5">
            <span>🔐</span> Secured with end-to-end encryption
          </p>
          <p className="text-xs text-gray-soft/30 mt-2">
            © 2024 Talish Talks. All rights reserved.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
