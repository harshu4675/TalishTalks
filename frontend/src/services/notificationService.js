import { pushAPI } from "./api";

class NotificationService {
  constructor() {
    this.permission =
      typeof Notification !== "undefined" ? Notification.permission : "denied";
    this.swRegistration = null;
    this.audioContext = null;
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

  async subscribeToPush() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.warn("Push notifications not supported in this browser");
        return false;
      }

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

      let subscription =
        await this.swRegistration.pushManager.getSubscription();

      if (!subscription) {
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

  // 🔥 Web Audio beep - no MP3 file needed!
  playSound() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (
          window.AudioContext || window.webkitAudioContext
        )();
      }

      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }

      const ctx = this.audioContext;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Pleasant 2-tone notification beep
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        440,
        ctx.currentTime + 0.15,
      );

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Silent fail
    }
  }

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
