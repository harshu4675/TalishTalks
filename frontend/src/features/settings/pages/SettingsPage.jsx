/**
 * SettingsPage - application preferences.
 *
 * Sections are deliberately small and independent so new preferences can be
 * added without touching the rest of the page.
 */

import { useEffect, useState } from "react";
import { FiBell, FiGlobe, FiInfo, FiLogOut, FiShield, FiSmartphone } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import AppLayout from "../../../app/AppLayout.jsx";

import { pushApi, userApi } from "../../../core/api/endpoints.js";
import config from "../../../core/config.js";
import { useAuth } from "../../../core/auth/useAuth.js";
import { useRealtime } from "../../../core/realtime/useRealtime.js";
import Avatar from "../../../shared/components/Avatar.jsx";
import Button from "../../../shared/components/Button.jsx";
import ConfirmDialog from "../../../shared/components/ConfirmDialog.jsx";
import { useToast } from "../../../shared/components/useToast.js";
import { Skeleton } from "../../../shared/components/Feedback.jsx";

/**
 * The settings screen.
 */
export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { connectionState, isConnected } = useRealtime();
  const toast = useToast();
  const navigate = useNavigate();

  const [pushState, setPushState] = useState({ supported: false, enabled: false, available: false });
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockedUsersLoading, setBlockedUsersLoading] = useState(true);
  const [blockedUsersError, setBlockedUsersError] = useState("");
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supported =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (!cancelled) setPushState((current) => ({ ...current, supported }));
      if (supported) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          const subscription = await registration?.pushManager.getSubscription();
          if (!cancelled) setPushState((current) => ({ ...current, enabled: Boolean(subscription) }));
        } catch {
          if (!cancelled) setPushState((current) => ({ ...current, enabled: false }));
        }
      }

      try {
        const data = await pushApi.vapidKey();
        if (cancelled) return;
        setPushState((current) => ({
          ...current,
          available: Boolean(data.enabled && data.publicKey),
        }));
      } catch {
        if (!cancelled) setPushState((current) => ({ ...current, available: false }));
      } finally {
        if (!cancelled) setPreferencesLoading(false);
      }

      try {
        const data = await userApi.blocked();
        if (!cancelled) {
          setBlockedUsers(data.blockedUsers || []);
          setBlockedUsersError("");
        }
      } catch (error) {
        if (!cancelled) setBlockedUsersError(error.message || "Could not load blocked people.");
      } finally {
        if (!cancelled) setBlockedUsersLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const togglePush = async () => {
    if (!pushState.supported) {
      toast.warning(
        "Not supported",
        "This browser cannot show push notifications for Talish Talks.",
      );
      return;
    }

    try {
      if (pushState.enabled) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await pushApi.unsubscribe(subscription.endpoint);
          await subscription.unsubscribe();
        }
        setPushState((current) => ({ ...current, enabled: false }));
        toast.info("Notifications off", "You will no longer receive push notifications.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.warning("Permission denied", "Your browser blocked notification permission.");
        return;
      }

      const { publicKey } = await pushApi.vapidKey();
      if (!publicKey) {
        toast.warning(
          "Not configured",
          "Push notifications are not configured on this server yet.",
        );
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await pushApi.subscribe(subscription.toJSON());
      setPushState((current) => ({ ...current, enabled: true }));
      toast.success("Notifications on", "You will be notified about new messages.");
    } catch (error) {
      toast.error("Could not update notifications", error.message);
    }
  };

  const unblock = async (blockedUser) => {
    setBusyId(blockedUser._id);
    try {
      await userApi.unblock(blockedUser._id);
      setBlockedUsers((current) => current.filter((entry) => entry._id !== blockedUser._id));
      toast.success("Unblocked", `${blockedUser.fullName} can message you again.`);
    } catch (error) {
      toast.error("Could not unblock", error.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleLogout = async () => {
    setConfirmLogout(false);
    await logout();
    navigate("/signin", { replace: true });
  };

  return (
    <AppLayout
      eyebrow="Preferences"
      title="Settings"
      subtitle="Control how Talish Talks behaves on this device and how it notifies you."
    >
      <div>

        <section className="card">
          <div className="card__header">
            <h2 className="card__title">
              <FiBell size={16} style={{ display: "inline", verticalAlign: "-2px" }} /> Notifications
            </h2>
          </div>
          <div className="card__body" style={{ display: "grid", gap: "var(--space-4)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              <div>
                <p style={{ fontWeight: "var(--weight-semibold)" }}>Push notifications</p>
                <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>
                  {pushState.supported
                    ? "Get notified even when Talish Talks is in the background."
                    : "This browser does not support push notifications."}
                </p>
              </div>
              <Button
                variant={pushState.enabled ? "secondary" : "primary"}
                size="sm"
                onClick={togglePush}
                disabled={!config.pushEnabled || preferencesLoading}
                loading={preferencesLoading}
              >
                {pushState.enabled ? "Turn off" : "Turn on"}
              </Button>
            </div>

            {!pushState.available && pushState.supported ? (
              <p className="callout callout--warning">
                <FiInfo className="callout__icon" size={16} />
                <span>
                  The server has no VAPID key configured yet, so push delivery is unavailable.
                  In-app notifications still work.
                </span>
              </p>
            ) : null}
          </div>
        </section>

        <section className="section card">
          <div className="card__header">
            <h2 className="card__title">
              <FiShield size={16} style={{ display: "inline", verticalAlign: "-2px" }} /> Privacy
            </h2>
          </div>
          <div className="card__body" style={{ display: "grid", gap: "var(--space-4)" }}>
            <div>
              <p style={{ fontWeight: "var(--weight-semibold)" }}>Blocked people</p>
              {blockedUsersLoading ? (
                <div style={{ display: "grid", gap: "var(--space-3)", marginTop: "var(--space-3)" }} aria-label="Loading blocked people">
                  {[0, 1].map((index) => <div key={index} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}><Skeleton width={36} height={36} circle /><Skeleton width="55%" height={12} /></div>)}
                </div>
              ) : blockedUsersError ? (
                <p role="status" style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>{blockedUsersError}</p>
              ) : blockedUsers.length === 0 ? (
                <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>
                  You have not blocked anyone.
                </p>
              ) : (
                <ul style={{ display: "grid", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
                  {blockedUsers.map((blockedUser) => (
                    <li
                      key={blockedUser._id}
                      style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}
                    >
                      <Avatar src={blockedUser.avatar} name={blockedUser.fullName} size="sm" />
                      <span style={{ flex: 1 }}>
                        {blockedUser.fullName}{" "}
                        <span style={{ color: "var(--text-tertiary)" }}>@{blockedUser.username}</span>
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => unblock(blockedUser)}
                        disabled={busyId === blockedUser._id}
                      >
                        Unblock
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="section card">
          <div className="card__header">
            <h2 className="card__title">
              <FiGlobe size={16} style={{ display: "inline", verticalAlign: "-2px" }} /> Connection
            </h2>
          </div>
          <div className="card__body" style={{ display: "grid", gap: "var(--space-4)" }}>
            <div className="stat">
              <span className="stat__value">
                {isConnected ? "Live" : connectionState}
              </span>
              <span className="stat__label">Realtime status</span>
            </div>
            <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>
              Messages are delivered over a persistent Socket.IO connection. When it drops, the app
              reconnects automatically and refetches what changed.
            </p>
          </div>
        </section>

        <section className="section card">
          <div className="card__header">
            <h2 className="card__title">
              <FiInfo size={16} style={{ display: "inline", verticalAlign: "-2px" }} /> About
            </h2>
          </div>
          <div className="card__body" style={{ display: "grid", gap: "var(--space-3)" }}>
            <div className="stat">
              <span className="stat__value">{config.appName}</span>
              <span className="stat__label">Application</span>
            </div>
            <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>
              Signed in as {user?.fullName} (@{user?.username}).
            </p>
          </div>
        </section>

        <section className="section card">
          <div className="card__header">
            <h2 className="card__title">
              <FiSmartphone size={16} style={{ display: "inline", verticalAlign: "-2px" }} /> Device
            </h2>
          </div>
          <div className="card__body" style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-4)", flexWrap: "wrap" }}>
            <p style={{ color: "var(--text-secondary)", maxWidth: "46ch" }}>
              Signing out removes this session from the device. Nothing is deleted from your
              conversations.
            </p>
            <Button variant="danger-ghost" onClick={() => setConfirmLogout(true)}>
              <FiLogOut size={15} /> Sign out
            </Button>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="Sign out of Talish Talks?"
        message="You will need to sign in again to read and send messages."
        confirmLabel="Sign out"
        danger
        onConfirm={handleLogout}
      />
    </AppLayout>
  );
}

/**
 * Convert a base64url VAPID key into the Uint8Array the browser expects.
 */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }
  return outputArray;
}
