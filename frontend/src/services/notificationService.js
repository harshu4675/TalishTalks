import { pushAPI } from "./api";

class NotificationService {
  registration = null;
  async ready() {
    if (!("serviceWorker" in navigator)) throw new Error("Notifications are not supported in this browser.");
    this.registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Notification service is not ready. Reload and try again.")), 10000)),
    ]);
    return this.registration;
  }
  async isSubscribed() {
    const registration = await this.ready();
    return !!(await registration.pushManager.getSubscription());
  }
  async subscribeToPush() {
    if (!("PushManager" in window) || !import.meta.env.VITE_VAPID_PUBLIC_KEY) return false;
    if (Notification.permission === "denied") return false;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;
    const registration = await this.ready();
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const base64 = import.meta.env.VITE_VAPID_PUBLIC_KEY.replace(/-/g, "+").replace(/_/g, "/");
      const raw = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, (character) => character.charCodeAt(0)) });
    }
    try { await pushAPI.subscribe(subscription.toJSON()); }
    catch (error) { await subscription.unsubscribe().catch(() => {}); throw error; }
    return true;
  }
  async unsubscribeFromPush() {
    const registration = await this.ready();
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await pushAPI.unsubscribe(subscription.endpoint);
      if (!(await subscription.unsubscribe())) throw new Error("Could not remove the browser subscription.");
    }
    return true;
  }
  async show(title, options = {}) {
    if (!("Notification" in window) || Notification.permission !== "granted" || document.visibilityState === "visible") return;
    const registration = await this.ready();
    await registration.showNotification(title, { icon: "/pwa-192x192.png", badge: "/pwa-192x192.png", ...options });
  }
  showMessage(senderName, content, chatId) {
    return this.show(senderName, { body: content, tag: `chat-${chatId}`, data: { chatId, url: `/chat/${chatId}` } }).catch(() => {});
  }
  showFriendRequest(name) { return this.show("New friend request", { body: `${name} sent you a friend request`, tag: "friend-request" }).catch(() => {}); }
  showFriendAccepted(name) { return this.show("Friend request accepted", { body: `${name} accepted your friend request`, tag: "friend-accepted" }).catch(() => {}); }
}
export default new NotificationService();
