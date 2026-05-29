class NotificationService {
  constructor() {
    this.permission =
      typeof Notification !== "undefined" ? Notification.permission : "denied";
    this.sound = null;
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

  async requestPermission() {
    if (!("Notification" in window)) return false;
    if (this.permission === "granted") return true;
    if (this.permission === "denied") return false;

    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission === "granted";
  }

  playSound() {
    if (!this.sound) return;
    try {
      this.sound.currentTime = 0;
      this.sound.play().catch(() => {});
    } catch (e) {}
  }

  show(title, options = {}) {
    if (this.permission !== "granted") return null;
    // Only show native notification if tab is hidden
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
