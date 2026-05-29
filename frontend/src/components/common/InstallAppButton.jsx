import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineDownload, HiOutlineX, HiOutlineCheck } from "react-icons/hi";
import toast from "react-hot-toast";
import { usePWA } from "../../context/PWAContext"; // 🔥 CHANGED

const InstallAppButton = ({ variant = "button", className = "" }) => {
  const { isInstallable, isInstalled, installPWA } = usePWA(); // 🔥 CHANGED
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  // Don't show if already installed
  if (isInstalled) {
    if (variant === "card") {
      return (
        <div
          className={`p-3 rounded-xl flex items-center gap-3 ${className}`}
          style={{
            backgroundColor: "var(--color-bgInput)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#22c55e" }}
          >
            <HiOutlineCheck className="text-white text-xl" />
          </div>
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--color-text)" }}
            >
              App Installed
            </p>
            <p className="text-xs" style={{ color: "var(--color-textMuted)" }}>
              You're using the installed version
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSHelp(true);
      return;
    }

    if (!isInstallable) {
      toast.error(
        "Install not available. Make sure you're using Chrome/Edge and the app isn't already installed.",
      );
      return;
    }

    const result = await installPWA();
    if (result.success) {
      toast.success("App installed successfully! 🎉");
    } else if (result.reason === "dismissed") {
      toast("Install cancelled", { icon: "ℹ️" });
    }
  };

  // ===== CARD VARIANT =====
  if (variant === "card") {
    return (
      <>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleInstall}
          className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${className}`}
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
          }}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/20">
            <HiOutlineDownload className="text-white text-xl" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-white">Install App</p>
            <p className="text-xs text-white/80">
              {isIOS
                ? "Add to home screen"
                : "Get notifications & offline access"}
            </p>
          </div>
        </motion.button>

        {/* iOS Help Modal */}
        <AnimatePresence>
          {showIOSHelp && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowIOSHelp(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="fixed inset-0 z-[201] flex items-center justify-center p-4"
                onClick={() => setShowIOSHelp(false)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm rounded-2xl p-5"
                  style={{
                    backgroundColor: "var(--color-bgCard)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3
                      className="font-semibold text-lg"
                      style={{ color: "var(--color-text)" }}
                    >
                      Install on iOS
                    </h3>
                    <button
                      onClick={() => setShowIOSHelp(false)}
                      style={{ color: "var(--color-textMuted)" }}
                    >
                      <HiOutlineX />
                    </button>
                  </div>
                  <ol
                    className="space-y-3 text-sm"
                    style={{ color: "var(--color-text)" }}
                  >
                    <li className="flex gap-3">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          backgroundColor: "var(--color-primary)",
                          color: "white",
                        }}
                      >
                        1
                      </span>
                      <span>
                        Tap the <strong>Share</strong> button at the bottom
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          backgroundColor: "var(--color-primary)",
                          color: "white",
                        }}
                      >
                        2
                      </span>
                      <span>
                        Tap <strong>"Add to Home Screen"</strong>
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          backgroundColor: "var(--color-primary)",
                          color: "white",
                        }}
                      >
                        3
                      </span>
                      <span>
                        Tap <strong>"Add"</strong> in the top-right
                      </span>
                    </li>
                  </ol>
                  <button
                    onClick={() => setShowIOSHelp(false)}
                    className="w-full mt-5 py-2.5 rounded-lg text-white font-medium"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    Got it
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ===== ICON VARIANT =====
  if (variant === "icon") {
    return (
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleInstall}
        className={`p-2 rounded-lg transition-colors hover:bg-black/20 ${className}`}
        style={{ color: "var(--color-textMuted)" }}
        title="Install App"
      >
        <HiOutlineDownload className="text-lg" />
      </motion.button>
    );
  }

  // ===== DEFAULT BUTTON =====
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleInstall}
      className={`px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition-all ${className}`}
      style={{
        background:
          "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
      }}
    >
      <HiOutlineDownload className="text-lg" />
      Install App
    </motion.button>
  );
};

export default InstallAppButton;
