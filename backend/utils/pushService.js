const webpush = require("web-push");
const User = require("../models/User");

const pushConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
let configured = false;

const sendPushToUser = async (userId, payload) => {
  if (!pushConfigured()) return { sent: 0, failed: 0, disabled: true };
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@example.com",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
    configured = true;
  }
  try {
    const user = await User.findById(userId).select("pushSubscriptions");
    if (!user?.pushSubscriptions.length) return { sent: 0, failed: 0 };
    const body = JSON.stringify({
      title: payload.title || "Talish Talks",
      body: payload.body || "You have a new notification",
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: payload.tag || "talish-notification",
      data: payload.data || {},
    });
    const invalidSubs = [];
    let sent = 0;
    let failed = 0;
    await Promise.all(user.pushSubscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
        }, body);
        sent++;
      } catch (error) {
        failed++;
        if ([404, 410].includes(error.statusCode)) invalidSubs.push(subscription.endpoint);
        console.error("Push delivery failed:", error.statusCode || error.message);
      }
    }));
    if (invalidSubs.length) {
      await User.updateOne({ _id: userId }, {
        $pull: { pushSubscriptions: { endpoint: { $in: invalidSubs } } },
      });
    }
    return { sent, failed };
  } catch (error) {
    console.error("Push delivery failed:", error.message);
    return { sent: 0, failed: 1 };
  }
};

module.exports = { sendPushToUser, pushConfigured };
