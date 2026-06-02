import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineLockClosed,
  HiOutlineLockOpen,
  HiOutlineX,
  HiOutlineKey,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { useBackButton } from "../../hooks/useBackButton";

const PASSWORD_KEY = "talish_site_password";
const HINT_KEY = "talish_site_password_hint";
const LOCK_ENABLED_KEY = "talish_site_lock_enabled";

// Same hash function as SiteLock
const hashPassword = (password) => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `talish_${Math.abs(hash).toString(36)}_${password.length}`;
};

const SiteLockToggle = () => {
  const [enabled, setEnabled] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  // Back button closes confirm modal
  useBackButton(showConfirm, () => {
    setShowConfirm(false);
    setPassword("");
    setError("");
  });

  useEffect(() => {
    // Check current state
    const lockEnabled = localStorage.getItem(LOCK_ENABLED_KEY);
    // Default: enabled (true) unless explicitly disabled
    setEnabled(lockEnabled !== "false");
  }, []);

  const handleToggle = () => {
    if (enabled) {
      // Turning OFF - require password confirmation
      setShowConfirm(true);
    } else {
      // Turning ON - just enable it
      const hasPassword = localStorage.getItem(PASSWORD_KEY);
      if (!hasPassword) {
        toast.error(
          "No password set. Please reload to setup site lock password.",
        );
        return;
      }
      localStorage.setItem(LOCK_ENABLED_KEY, "true");
      setEnabled(true);
      toast.success("Site Lock enabled 🔒");
    }
  };

  const handleConfirmDisable = async (e) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Please enter your password");
      return;
    }

    setVerifying(true);
    await new Promise((r) => setTimeout(r, 400));

    const savedPassword = localStorage.getItem(PASSWORD_KEY);
    const inputHashed = hashPassword(password);

    if (inputHashed !== savedPassword) {
      setError("Incorrect password");
      setVerifying(false);
      return;
    }

    // Password correct - disable lock
    localStorage.setItem(LOCK_ENABLED_KEY, "false");
    setEnabled(false);
    setShowConfirm(false);
    setPassword("");
    setVerifying(false);
    toast.success("Site Lock disabled 🔓");
  };

  return (
    <>
      <div
        className="p-3 rounded-xl flex items-center gap-3"
        style={{
          backgroundColor: "var(--color-bgInput)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: enabled
              ? "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)"
              : "var(--color-border)",
          }}
        >
          {enabled ? (
            <HiOutlineLockClosed className="text-white text-lg" />
          ) : (
            <HiOutlineLockOpen
              className="text-lg"
              style={{ color: "var(--color-textMuted)" }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            Site Lock
          </p>
          <p className="text-xs" style={{ color: "var(--color-textMuted)" }}>
            {enabled
              ? "Password required on every visit"
              : "App opens without password"}
          </p>
        </div>

        {/* Toggle Switch */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleToggle}
          className="relative w-12 h-7 rounded-full transition-colors flex-shrink-0"
          style={{
            backgroundColor: enabled
              ? "var(--color-primary)"
              : "var(--color-border)",
          }}
        >
          <motion.div
            animate={{ x: enabled ? 20 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
          />
        </motion.button>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowConfirm(false);
                setPassword("");
                setError("");
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300]"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-0 z-[301] flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
                style={{
                  backgroundColor: "var(--color-bgCard)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {/* Header */}
                <div
                  className="p-5 border-b flex items-center justify-between"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
                      }}
                    >
                      <HiOutlineKey className="text-white text-lg" />
                    </div>
                    <h3
                      className="font-semibold text-base"
                      style={{ color: "var(--color-text)" }}
                    >
                      Confirm Password
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowConfirm(false);
                      setPassword("");
                      setError("");
                    }}
                    className="p-1 rounded-lg"
                    style={{ color: "var(--color-textMuted)" }}
                  >
                    <HiOutlineX className="text-lg" />
                  </button>
                </div>

                {/* Body */}
                <form onSubmit={handleConfirmDisable} className="p-5 space-y-4">
                  <div
                    className="p-3 rounded-lg text-xs flex items-start gap-2"
                    style={{
                      backgroundColor: "rgba(251, 54, 64, 0.1)",
                      border: "1px solid var(--color-primary)",
                      color: "var(--color-text)",
                    }}
                  >
                    <span className="text-base">⚠️</span>
                    <p>
                      <strong>Disable Site Lock?</strong> Anyone who opens this
                      site will be able to access your account without a
                      password.
                    </p>
                  </div>

                  <div>
                    <label
                      className="block text-xs font-medium mb-1.5"
                      style={{ color: "var(--color-textMuted)" }}
                    >
                      Enter your password to confirm
                    </label>
                    <div className="relative">
                      <HiOutlineLockClosed
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-lg"
                        style={{ color: "var(--color-textMuted)" }}
                      />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError("");
                        }}
                        placeholder="Your password"
                        autoFocus
                        disabled={verifying}
                        className="input-dark pl-10"
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-xs"
                    >
                      {error}
                    </motion.p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowConfirm(false);
                        setPassword("");
                        setError("");
                      }}
                      disabled={verifying}
                      className="btn-ghost flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!password || verifying}
                      className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                      style={{
                        background:
                          "linear-gradient(135deg, #FB3640 0%, #D62B33 100%)",
                      }}
                    >
                      {verifying ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Verifying...
                        </span>
                      ) : (
                        "Disable Lock"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default SiteLockToggle;
