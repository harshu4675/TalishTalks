import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineDownload, HiOutlineX } from "react-icons/hi";

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem("pwa-dismissed");
      if (!dismissed) setShowPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-dismissed", "true");
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[200] rounded-2xl p-4 shadow-2xl"
          style={{
            backgroundColor: "var(--color-bgCard)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              <HiOutlineDownload className="text-white text-2xl" />
            </div>
            <div className="flex-1">
              <h3
                className="font-semibold"
                style={{ color: "var(--color-text)" }}
              >
                Install Talish
              </h3>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-textMuted)" }}
              >
                Install our app for a better experience with offline support
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  className="px-4 py-1.5 text-white text-sm rounded-lg"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  Install
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-1.5 text-sm"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              style={{ color: "var(--color-textMuted)" }}
            >
              <HiOutlineX />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
