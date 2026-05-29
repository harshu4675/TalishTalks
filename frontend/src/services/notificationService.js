import { pushAPI } from "./api";

class NotificationService {
  constructor() {
    this.permission =
      typeof Notification !== "undefined" ? Notification.permission : "denied";
    this.sound = null;
    this.swRegistration = null;
    this.initSound();
  }

  initSound() {
    try {
      this.sound = new Audio("/sounds/notification.mp3");
      this.sound.volume = 0.5;
    } catch (e) {
      console.warn("Notification sound not available");
    }
  }

  async init() {
    if ("serviceWorker" in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.ready;
        console.log("✅ Service Worker ready");
      } catch (err) {
        console.error("Service Worker error:", err);
      }
    }
  }

  async requestPermission() {
    if (!("Notification" in window)) return false;
    if (this.permission === "granted") return true;
    if (this.permission === "denied") return false;

    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission === "granted";
  }

  // Convert VAPID key to Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // 🔥 Subscribe to push notifications (works even when app closed)
  async subscribeToPush() {
    try {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn("Push permission denied");
        return false;
      }

      await this.init();
      if (!this.swRegistration) {
        console.error("Service worker not registered");
        return false;
      }

      // Check existing subscription
      let subscription =
        await this.swRegistration.pushManager.getSubscription();

      if (!subscription) {
        // Get VAPID key from env
        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          console.error("VAPID public key missing in env");
          return false;
        }

        subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidKey),
        });
      }

      // Send subscription to backend
      await pushAPI.subscribe(subscription);
      console.log("✅ Push subscription saved");
      return true;
    } catch (err) {
      console.error("Push subscribe error:", err);
      return false;
    }
  }

  async unsubscribeFromPush() {
    try {
      if (!this.swRegistration) await this.init();
      const subscription =
        await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await pushAPI.unsubscribe(subscription.endpoint);
        await subscription.unsubscribe();
      }
      return true;
    } catch (err) {
      console.error("Unsubscribe error:", err);
      return false;
    }
  }

  playSound() {
    if (!this.sound) return;
    try {
      this.sound.currentTime = 0;
      this.sound.play().catch(() => {});
    } catch (e) {}
  }

  // In-app notification (when app is open)
  show(title, options = {}) {
    if (this.permission !== "granted") return null;
    if (document.visibilityState === "visible") return null;

    try {
      const notification = new Notification(title, {
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        if (options.onClick) options.onClick();
        notification.close();
      };

      setTimeout(() => notification.close(), 6000);
      return notification;
    } catch (e) {
      return null;
    }
  }

  showMessage(senderName, content, chatId, onClick) {
    this.playSound();
    return this.show(`${senderName}`, {
      body: content,
      tag: `chat-${chatId}`,
      data: { chatId },
      onClick,
    });
  }

  showFriendRequest(senderName) {
    this.playSound();
    return this.show("New Friend Request", {
      body: `${senderName} sent you a friend request`,
      tag: "friend-request",
    });
  }

  showFriendAccepted(name) {
    this.playSound();
    return this.show("Friend Request Accepted", {
      body: `${name} accepted your friend request`,
      tag: "friend-accepted",
    });
  }
}

export default new NotificationService();
