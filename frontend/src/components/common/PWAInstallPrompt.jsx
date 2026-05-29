import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineDownload, HiOutlineX, HiOutlineBell } from "react-icons/hi";
import notificationService from "../../services/notificationService";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { usePWA } from "../../context/PWAContext";

const PWAInstallPrompt = () => {
  const { user } = useAuth();
  const { isInstallable, isInstalled, installPWA } = usePWA();
  const [showInstall, setShowInstall] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  useEffect(() => {
    if (isInstallable && !isInstalled) {
      const dismissed = localStorage.getItem("pwa-install-dismissed");
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      if (!dismissed || Date.now() - dismissedTime > 3 * 24 * 60 * 60 * 1000) {
        setTimeout(() => setShowInstall(true), 2000);
      }
    }
  }, [isInstallable, isInstalled]);

  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window)) return;

    const notifDismissed = localStorage.getItem("notif-prompt-dismissed");
    const shouldPrompt =
      Notification.permission === "default" &&
      !notifDismissed &&
      (isInstalled || !showInstall);

    if (shouldPrompt) {
      setTimeout(() => setShowNotifPrompt(true), 4000);
    }
  }, [user, isInstalled, showInstall]);

  const handleInstall = async () => {
    const result = await installPWA();
    if (result.success) {
      setShowInstall(false);
      toast.success("App installed! 🎉");
    }
  };

  const handleDismissInstall = () => {
    setShowInstall(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  const handleEnableNotifications = async () => {
    const success = await notificationService.subscribeToPush();
    if (success) {
      toast.success("Notifications enabled! 🔔");
    } else {
      toast.error("Permission denied. Enable in browser settings.");
    }
    setShowNotifPrompt(false);
    localStorage.setItem("notif-prompt-dismissed", "true");
  };

  const handleDismissNotif = () => {
    setShowNotifPrompt(false);
    localStorage.setItem("notif-prompt-dismissed", "true");
  };

  return (
    <>
      {/* Install Banner - FIXED OVERFLOW */}
      <AnimatePresence>
        {showInstall && !isInstalled && (
          <motion.div
            initial={{ y: -150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -150, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 right-0 z-[200] px-3 flex justify-center pointer-events-none"
            style={{
              top: "max(0.5rem, env(safe-area-inset-top))",
            }}
          >
            <div
              className="w-full max-w-sm rounded-xl shadow-2xl pointer-events-auto"
              style={{
                backgroundColor: "var(--color-bgCard)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-center gap-2 p-2.5">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  <HiOutlineDownload className="text-white text-lg" />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p
                    className="text-xs font-semibold leading-tight truncate"
                    style={{ color: "var(--color-text)" }}
                  >
                    Install Talish App
                  </p>
                  <p
                    className="text-[10px] leading-tight mt-0.5 truncate"
                    style={{ color: "var(--color-textMuted)" }}
                  >
                    Faster access & notifications
                  </p>
                </div>
                <button
                  onClick={handleInstall}
                  className="px-2.5 py-1.5 text-white text-xs font-medium rounded-lg flex-shrink-0"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  Install
                </button>
                <button
                  onClick={handleDismissInstall}
                  className="p-1 flex-shrink-0"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  <HiOutlineX className="text-base" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Banner - FIXED OVERFLOW */}
      <AnimatePresence>
        {showNotifPrompt && (
          <motion.div
            initial={{ y: -150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -150, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 right-0 z-[200] px-3 flex justify-center pointer-events-none"
            style={{
              top: "max(0.5rem, env(safe-area-inset-top))",
            }}
          >
            <div
              className="w-full max-w-sm rounded-xl shadow-2xl pointer-events-auto"
              style={{
                backgroundColor: "var(--color-bgCard)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-center gap-2 p-2.5">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  <HiOutlineBell className="text-white text-lg" />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p
                    className="text-xs font-semibold leading-tight truncate"
                    style={{ color: "var(--color-text)" }}
                  >
                    Enable Notifications
                  </p>
                  <p
                    className="text-[10px] leading-tight mt-0.5 truncate"
                    style={{ color: "var(--color-textMuted)" }}
                  >
                    Get alerts when app is closed
                  </p>
                </div>
                <button
                  onClick={handleEnableNotifications}
                  className="px-2.5 py-1.5 text-white text-xs font-medium rounded-lg flex-shrink-0"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  Enable
                </button>
                <button
                  onClick={handleDismissNotif}
                  className="p-1 flex-shrink-0"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  <HiOutlineX className="text-base" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PWAInstallPrompt;
