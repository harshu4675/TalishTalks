import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineDownload, HiOutlineX, HiOutlineBell } from "react-icons/hi";
import notificationService from "../../services/notificationService";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { usePWA } from "../../context/PWAContext";
import { useBackButton } from "../../hooks/useBackButton"; // 🔥 NEW

const PWAInstallPrompt = () => {
  const { user } = useAuth();
  const { isInstallable, isInstalled, installPWA } = usePWA();
  const [showInstall, setShowInstall] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  // 🔥 NEW: Back button closes install modal
  useBackButton(showInstall, () => setShowInstall(false));

  // 🔥 NEW: Back button closes notification modal
  useBackButton(showNotifPrompt, () => setShowNotifPrompt(false));

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
      localStorage.setItem("notifications-enabled", "true");
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
      {/* INSTALL POPUP */}
      <AnimatePresence>
        {showInstall && !isInstalled && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDismissInstall}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[199]"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="w-full max-w-xs rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
                style={{
                  backgroundColor: "var(--color-bgCard)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex justify-end p-2">
                  <button
                    onClick={handleDismissInstall}
                    className="p-1 rounded-lg"
                    style={{ color: "var(--color-textMuted)" }}
                  >
                    <HiOutlineX className="text-lg" />
                  </button>
                </div>

                <div className="px-5 pb-5 text-center">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
                    }}
                  >
                    <HiOutlineDownload className="text-white text-3xl" />
                  </div>

                  <h3
                    className="text-base font-semibold mb-1"
                    style={{ color: "var(--color-text)" }}
                  >
                    Install Talish App
                  </h3>
                  <p
                    className="text-xs mb-4"
                    style={{ color: "var(--color-textMuted)" }}
                  >
                    Get a faster experience with notifications & offline access
                  </p>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleInstall}
                      className="w-full py-2.5 text-white text-sm font-medium rounded-xl"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
                      }}
                    >
                      Install Now
                    </button>
                    <button
                      onClick={handleDismissInstall}
                      className="w-full py-2 text-xs"
                      style={{ color: "var(--color-textMuted)" }}
                    >
                      Maybe Later
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* NOTIFICATION POPUP */}
      <AnimatePresence>
        {showNotifPrompt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDismissNotif}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[199]"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="w-full max-w-xs rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
                style={{
                  backgroundColor: "var(--color-bgCard)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex justify-end p-2">
                  <button
                    onClick={handleDismissNotif}
                    className="p-1 rounded-lg"
                    style={{ color: "var(--color-textMuted)" }}
                  >
                    <HiOutlineX className="text-lg" />
                  </button>
                </div>

                <div className="px-5 pb-5 text-center">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
                    }}
                  >
                    <HiOutlineBell className="text-white text-3xl" />
                  </div>

                  <h3
                    className="text-base font-semibold mb-1"
                    style={{ color: "var(--color-text)" }}
                  >
                    Enable Notifications
                  </h3>
                  <p
                    className="text-xs mb-4"
                    style={{ color: "var(--color-textMuted)" }}
                  >
                    Get instant message alerts even when the app is closed
                  </p>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleEnableNotifications}
                      className="w-full py-2.5 text-white text-sm font-medium rounded-xl"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
                      }}
                    >
                      Enable Notifications
                    </button>
                    <button
                      onClick={handleDismissNotif}
                      className="w-full py-2 text-xs"
                      style={{ color: "var(--color-textMuted)" }}
                    >
                      Not Now
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default PWAInstallPrompt;
