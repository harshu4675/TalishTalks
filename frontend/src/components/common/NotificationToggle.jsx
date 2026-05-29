import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HiOutlineBell, HiOutlineBellOff } from "react-icons/hi";
import toast from "react-hot-toast";
import notificationService from "../../services/notificationService";

const NotificationToggle = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    // Check if notifications are supported
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setSupported(false);
      return;
    }

    // Check current state
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      if (Notification.permission !== "granted") {
        setEnabled(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setEnabled(!!subscription);
    } catch (err) {
      console.error("Check subscription error:", err);
      setEnabled(false);
    }
  };

  const handleToggle = async () => {
    setLoading(true);

    try {
      if (enabled) {
        // Turn OFF
        const success = await notificationService.unsubscribeFromPush();
        if (success) {
          setEnabled(false);
          localStorage.setItem("notifications-enabled", "false");
          toast.success("Notifications disabled");
        } else {
          toast.error("Failed to disable notifications");
        }
      } else {
        // Turn ON
        const success = await notificationService.subscribeToPush();
        if (success) {
          setEnabled(true);
          localStorage.setItem("notifications-enabled", "true");
          toast.success("Notifications enabled! 🔔");
        } else {
          toast.error("Permission denied. Enable in browser settings.");
        }
      }
    } catch (err) {
      console.error("Toggle error:", err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div
        className="p-3 rounded-xl flex items-center gap-3"
        style={{
          backgroundColor: "var(--color-bgInput)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "var(--color-border)" }}
        >
          <HiOutlineBellOff
            className="text-lg"
            style={{ color: "var(--color-textMuted)" }}
          />
        </div>
        <div className="flex-1">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            Notifications
          </p>
          <p className="text-xs" style={{ color: "var(--color-textMuted)" }}>
            Not supported in this browser
          </p>
        </div>
      </div>
    );
  }

  return (
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
          <HiOutlineBell className="text-white text-lg" />
        ) : (
          <HiOutlineBellOff
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
          Push Notifications
        </p>
        <p className="text-xs" style={{ color: "var(--color-textMuted)" }}>
          {enabled
            ? "You'll receive message alerts"
            : "Get alerts when app is closed"}
        </p>
      </div>

      {/* Toggle Switch */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleToggle}
        disabled={loading}
        className="relative w-12 h-7 rounded-full transition-colors flex-shrink-0 disabled:opacity-50"
        style={{
          backgroundColor: enabled
            ? "var(--color-primary)"
            : "var(--color-border)",
        }}
      >
        <motion.div
          animate={{ x: enabled ? 20 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center"
        >
          {loading && (
            <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          )}
        </motion.div>
      </motion.button>
    </div>
  );
};

export default NotificationToggle;
