import React, { useState, useEffect } from "react";
import { HiOutlineBell } from "react-icons/hi";
import toast from "react-hot-toast";
import notificationService from "../../services/notificationService";
const NotificationToggle = () => {
  const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
  const [enabled, setEnabled] = useState(false), [permission, setPermission] = useState(supported ? Notification.permission : "default"), [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (supported) notificationService.isSubscribed().then((value) => { if (active) setEnabled(value); }).catch(() => {});
    return () => { active = false; };
  }, [supported]);
  const toggle = async () => {
    setBusy(true);
    try {
      if (enabled) { await notificationService.unsubscribeFromPush(); setEnabled(false); toast.success("Notifications disabled"); }
      else {
        const success = await notificationService.subscribeToPush();
        setPermission(Notification.permission); setEnabled(success);
        if (success) toast.success("Notifications enabled");
        else toast.error(Notification.permission === "denied" ? "Notifications are blocked. Allow them in your browser’s site settings." : "Could not enable notifications. Check this browser’s support and server configuration.");
      }
    } catch { toast.error("Could not change notification settings. Please try again."); }
    finally { setBusy(false); }
  };
  return <div className="settings-row"><HiOutlineBell /><div><strong>Push notifications</strong><p>{!supported ? "Not supported in this browser. On iPhone, install the app first." : permission === "denied" ? "Blocked in browser settings." : "Get notified when a message arrives."}</p></div><button className={`toggle ${enabled ? "on" : ""}`} role="switch" aria-checked={enabled} aria-label="Push notifications" disabled={!supported || busy} onClick={toggle} /></div>;
};
export default NotificationToggle;
