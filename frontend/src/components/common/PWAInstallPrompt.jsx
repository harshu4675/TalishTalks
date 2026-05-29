import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineDownload, HiOutlineX, HiOutlineBell } from "react-icons/hi";
import notificationService from "../../services/notificationService";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";

const PWAInstallPrompt = () => {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect if app is already installed (running in standalone mode)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Install prompt listener
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      const dismissed = localStorage.getItem("pwa-install-dismissed");
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      // Show again after 3 days
      if (!dismissed || Date.now() - dismissedTime > 3 * 24 * 60 * 60 * 1000) {
        setTimeout(() => setShowInstall(true), 2000);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Show notification permission prompt if installed but no permission yet
  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window)) return;

    const notifDismissed = localStorage.getItem("notif-prompt-dismissed");
    const shouldPrompt =
      Notification.permission === "default" &&
      !notifDismissed &&
      (isStandalone || !showInstall); // Show only when installed or no install prompt

    if (shouldPrompt) {
      setTimeout(() => setShowNotifPrompt(true), 4000);
    }
  }, [user, isStandalone, showInstall]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstall(false);
      toast.success("App installed! 🎉");
    }
    setDeferredPrompt(null);
  };

  const handleDismissInstall = () => {
    setShowInstall(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  const handleEnableNotifications = async () => {
    const success = await notificationService.subscribeToPush();
    if (success) {
      toast.success("Notifications enabled! 🔔");
      setShowNotifPrompt(false);
    } else {
      toast.error("Permission denied. Enable in browser settings.");
      setShowNotifPrompt(false);
    }
    localStorage.setItem("notif-prompt-dismissed", "true");
  };

  const handleDismissNotif = () => {
    setShowNotifPrompt(false);
    localStorage.setItem("notif-prompt-dismissed", "true");
  };

  return (
    <>
      {/* Install Banner */}
      <AnimatePresence>
        {showInstall && !isStandalone && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 z-[200] w-[92%] max-w-sm rounded-xl shadow-2xl"
            style={{
              backgroundColor: "var(--color-bgCard)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center gap-2.5 p-2.5">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                <HiOutlineDownload className="text-white text-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-semibold leading-tight"
                  style={{ color: "var(--color-text)" }}
                >
                  Install Talish App
                </p>
                <p
                  className="text-[10px] leading-tight mt-0.5"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  Get notifications & faster access
                </p>
              </div>
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 text-white text-xs font-medium rounded-lg flex-shrink-0"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                Install
              </button>
              <button
                onClick={handleDismissInstall}
                className="p-1.5 flex-shrink-0"
                style={{ color: "var(--color-textMuted)" }}
              >
                <HiOutlineX className="text-base" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Permission Banner */}
      <AnimatePresence>
        {showNotifPrompt && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 z-[200] w-[92%] max-w-sm rounded-xl shadow-2xl"
            style={{
              backgroundColor: "var(--color-bgCard)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center gap-2.5 p-2.5">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                <HiOutlineBell className="text-white text-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-semibold leading-tight"
                  style={{ color: "var(--color-text)" }}
                >
                  Enable Notifications
                </p>
                <p
                  className="text-[10px] leading-tight mt-0.5"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  Get message alerts even when app is closed
                </p>
              </div>
              <button
                onClick={handleEnableNotifications}
                className="px-3 py-1.5 text-white text-xs font-medium rounded-lg flex-shrink-0"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                Enable
              </button>
              <button
                onClick={handleDismissNotif}
                className="p-1.5 flex-shrink-0"
                style={{ color: "var(--color-textMuted)" }}
              >
                <HiOutlineX className="text-base" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PWAInstallPrompt;
