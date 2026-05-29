const webpush = require("web-push");
const User = require("../models/User");

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@talish.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

/**
 * Send push notification to a specific user
 * @param {String} userId - The user to notify
 * @param {Object} payload - { title, body, icon, badge, data, tag }
 */
const sendPushToUser = async (userId, payload) => {
  try {
    const user = await User.findById(userId).select(
      "pushSubscriptions isOnline",
    );

    if (
      !user ||
      !user.pushSubscriptions ||
      user.pushSubscriptions.length === 0
    ) {
      return { sent: 0, failed: 0 };
    }

    const notificationPayload = JSON.stringify({
      title: payload.title || "Talish",
      body: payload.body || "You have a new notification",
      icon: payload.icon || "/pwa-192x192.png",
      badge: payload.badge || "/pwa-192x192.png",
      tag: payload.tag || "talish-notification",
      data: payload.data || {},
      vibrate: [200, 100, 200],
      requireInteraction: false,
    });

    let sent = 0;
    let failed = 0;
    const invalidSubs = [];

    await Promise.all(
      user.pushSubscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            notificationPayload,
          );
          sent++;
        } catch (err) {
          failed++;
          // 410 = subscription expired, 404 = not found
          if (err.statusCode === 410 || err.statusCode === 404) {
            invalidSubs.push(sub.endpoint);
          }
          console.error("Push send error:", err.statusCode, err.body);
        }
      }),
    );

    // Clean up invalid subscriptions
    if (invalidSubs.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: {
          pushSubscriptions: { endpoint: { $in: invalidSubs } },
        },
      });
    }

    console.log(`📲 Push sent to ${userId}: ${sent} success, ${failed} failed`);
    return { sent, failed };
  } catch (err) {
    console.error("sendPushToUser error:", err.message);
    return { sent: 0, failed: 0 };
  }
};

module.exports = { sendPushToUser };
