import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineLockClosed,
  HiOutlineLockOpen,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineKey,
  HiOutlineRefresh,
  HiCheckCircle,
} from "react-icons/hi";
import TalishLogo from "../../assets/logo";

const MASTER_RESET_KEY = "talishreset2024";
const PASSWORD_KEY = "talish_site_password";
const HINT_KEY = "talish_site_password_hint";
const LOCK_ENABLED_KEY = "talish_site_lock_enabled"; // 🔥 NEW

const hashPassword = (password) => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `talish_${Math.abs(hash).toString(36)}_${password.length}`;
};

const SiteLock = ({ onUnlock }) => {
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [mode, setMode] = useState("login");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hint, setHint] = useState("");
  const [resetKey, setResetKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [savedHint, setSavedHint] = useState("");
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const savedPassword = localStorage.getItem(PASSWORD_KEY);
    const hintFromStorage = localStorage.getItem(HINT_KEY);

    if (!savedPassword) {
      setIsFirstTime(true);
      setMode("setup");
    } else {
      setIsFirstTime(false);
      setMode("login");
      setSavedHint(hintFromStorage || "");
    }
  }, []);

  const handleSetup = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));

    const hashed = hashPassword(password);
    localStorage.setItem(PASSWORD_KEY, hashed);

    // 🔥 NEW: Enable site lock by default when setting up
    localStorage.setItem(LOCK_ENABLED_KEY, "true");

    if (hint.trim()) {
      localStorage.setItem(HINT_KEY, hint.trim());
    }

    setSuccess("🎉 Password set successfully! Logging you in...");
    setLoading(false);

    setTimeout(() => {
      onUnlock();
    }, 1000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (locked) return;

    setLoading(true);
    setError("");

    await new Promise((r) => setTimeout(r, 400));

    const savedPassword = localStorage.getItem(PASSWORD_KEY);
    const inputHashed = hashPassword(password);

    if (inputHashed === savedPassword) {
      onUnlock();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setError(
        `Wrong password. ${5 - newAttempts} attempt${
          5 - newAttempts > 1 ? "s" : ""
        } left.`,
      );
      setShake(true);
      setPassword("");
      setTimeout(() => setShake(false), 500);

      if (newAttempts >= 5) {
        setLocked(true);
        setError("🚫 Too many failed attempts. Try again in 30 seconds.");
        setTimeout(() => {
          setLocked(false);
          setAttempts(0);
          setError("");
        }, 30000);
      }
    }

    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");

    if (resetKey !== MASTER_RESET_KEY) {
      setError("Invalid reset key");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));

    // Clear all lock data
    localStorage.removeItem(PASSWORD_KEY);
    localStorage.removeItem(HINT_KEY);
    localStorage.removeItem(LOCK_ENABLED_KEY); // 🔥 NEW

    setSuccess("✅ Password reset! Please set a new password.");
    setLoading(false);

    setTimeout(() => {
      setIsFirstTime(true);
      setMode("setup");
      setPassword("");
      setConfirmPassword("");
      setResetKey("");
      setSuccess("");
      setError("");
      setAttempts(0);
      setLocked(false);
    }, 1500);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <motion.div
        animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ backgroundColor: "var(--color-primary)" }}
      />
      <motion.div
        animate={{ x: [0, -80, 0], y: [0, 80, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ backgroundColor: "var(--color-secondary)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: 1,
          y: 0,
          x: shake ? [0, -10, 10, -10, 10, 0] : 0,
        }}
        transition={{ duration: shake ? 0.4 : 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <TalishLogo size="lg" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-8 shadow-card-hover"
        >
          <div className="flex justify-center mb-6">
            <motion.div
              animate={{
                scale: success ? [1, 1.2, 1] : [1, 1.05, 1],
                rotate: locked ? [0, -5, 5, -5, 5, 0] : 0,
              }}
              transition={{
                scale: {
                  duration: success ? 0.4 : 2,
                  repeat: success ? 0 : Infinity,
                },
                rotate: { duration: 0.5 },
              }}
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-glow"
              style={{
                background: success
                  ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
                  : `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)`,
              }}
            >
              {success ? (
                <HiCheckCircle className="text-white text-4xl" />
              ) : mode === "setup" ? (
                <HiOutlineLockOpen className="text-white text-4xl" />
              ) : mode === "reset" ? (
                <HiOutlineKey className="text-white text-4xl" />
              ) : (
                <HiOutlineLockClosed className="text-white text-4xl" />
              )}
            </motion.div>
          </div>

          <div className="text-center mb-6">
            <h1
              className="text-2xl font-display font-bold mb-2"
              style={{ color: "var(--color-text)" }}
            >
              {mode === "setup"
                ? "🎨 Setup Your Password"
                : mode === "reset"
                  ? "🔑 Reset Password"
                  : "🔐 Welcome Back"}
            </h1>
            <p className="text-sm" style={{ color: "var(--color-textMuted)" }}>
              {mode === "setup"
                ? "Create your personal access password"
                : mode === "reset"
                  ? "Enter the master key to reset"
                  : "Enter your password to continue"}
            </p>
          </div>

          {mode === "setup" && (
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  New Password (min 4 chars)
                </label>
                <div className="relative">
                  <HiOutlineLockClosed
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-lg"
                    style={{ color: "var(--color-textMuted)" }}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create your password"
                    disabled={loading}
                    autoFocus
                    className="input-dark pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--color-textMuted)" }}
                  >
                    {showPassword ? (
                      <HiOutlineEyeOff className="text-lg" />
                    ) : (
                      <HiOutlineEye className="text-lg" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <HiOutlineLockClosed
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-lg"
                    style={{ color: "var(--color-textMuted)" }}
                  />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    disabled={loading}
                    className="input-dark pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--color-textMuted)" }}
                  >
                    {showConfirmPassword ? (
                      <HiOutlineEyeOff className="text-lg" />
                    ) : (
                      <HiOutlineEye className="text-lg" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  Password Hint (optional)
                </label>
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="e.g. My pet's name"
                  disabled={loading}
                  maxLength={50}
                  className="input-dark"
                />
                <p
                  className="text-[10px] mt-1"
                  style={{ color: "var(--color-textMuted)", opacity: 0.7 }}
                >
                  💡 Will be shown if you forget your password
                </p>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-red-400 text-xs"
                  >
                    {error}
                  </motion.p>
                )}
                {success && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-green-400 text-xs"
                  >
                    {success}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={!password || !confirmPassword || loading}
                className="btn-accent w-full"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Setting up...
                  </span>
                ) : (
                  "Set Password & Continue"
                )}
              </button>
            </form>
          )}

          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  Password
                </label>
                <div className="relative">
                  <HiOutlineLockClosed
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-lg"
                    style={{ color: "var(--color-textMuted)" }}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={locked || loading}
                    autoFocus
                    className="input-dark pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--color-textMuted)" }}
                  >
                    {showPassword ? (
                      <HiOutlineEyeOff className="text-lg" />
                    ) : (
                      <HiOutlineEye className="text-lg" />
                    )}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-red-400 text-xs"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={!password || locked || loading}
                className="btn-accent w-full"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : locked ? (
                  "🔒 Locked"
                ) : (
                  "Unlock Site"
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                {savedHint && (
                  <button
                    type="button"
                    onClick={() => setShowHint(!showHint)}
                    className="transition-colors"
                    style={{ color: "var(--color-textMuted)" }}
                  >
                    💡 {showHint ? "Hide hint" : "Show hint"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMode("reset");
                    setError("");
                    setPassword("");
                  }}
                  className="ml-auto transition-colors flex items-center gap-1"
                  style={{ color: "var(--color-primary)" }}
                >
                  <HiOutlineKey className="text-sm" />
                  Forgot password?
                </button>
              </div>

              <AnimatePresence>
                {showHint && savedHint && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 rounded-lg"
                    style={{
                      backgroundColor: "var(--color-bgInput)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <p
                      className="text-xs"
                      style={{ color: "var(--color-textMuted)" }}
                    >
                      <span className="font-semibold">Your hint:</span>{" "}
                      <span style={{ color: "var(--color-text)" }}>
                        {savedHint}
                      </span>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={handleReset} className="space-y-4">
              <div
                className="p-3 rounded-lg text-xs"
                style={{
                  backgroundColor: "var(--color-bgInput)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-textMuted)",
                }}
              >
                <p>
                  🔑 Enter the <strong>master reset key</strong> to delete the
                  current password and set a new one.
                </p>
                <p className="mt-2 text-[10px] opacity-70">
                  Master Key:{" "}
                  <code className="font-mono">{MASTER_RESET_KEY}</code>
                </p>
              </div>

              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  Master Reset Key
                </label>
                <div className="relative">
                  <HiOutlineKey
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-lg"
                    style={{ color: "var(--color-textMuted)" }}
                  />
                  <input
                    type="text"
                    value={resetKey}
                    onChange={(e) => setResetKey(e.target.value)}
                    placeholder="Enter reset key"
                    disabled={loading}
                    autoFocus
                    className="input-dark pl-10"
                  />
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-red-400 text-xs"
                  >
                    {error}
                  </motion.p>
                )}
                {success && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-green-400 text-xs"
                  >
                    {success}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setResetKey("");
                  }}
                  disabled={loading}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!resetKey || loading}
                  className="btn-accent flex-1"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Resetting...
                    </span>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </div>
            </form>
          )}

          <div
            className="mt-6 pt-6 border-t"
            style={{ borderColor: "var(--color-border)" }}
          >
            <p
              className="text-xs text-center"
              style={{ color: "var(--color-textMuted)" }}
            >
              {mode === "setup"
                ? "🔒 Your password is stored securely on this device"
                : "💡 This site is private. Access requires authorization."}
            </p>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs mt-6"
          style={{ color: "var(--color-textMuted)", opacity: 0.5 }}
        >
          © 2024 Talish Talks • Secured Access
        </motion.p>
      </motion.div>
    </div>
  );
};

export default SiteLock;
