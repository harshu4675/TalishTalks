const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const asyncHandler = require("../middleware/asyncHandler");
const User = require("../models/User");
const { pushConfigured } = require("../utils/pushService");
const router = express.Router();

const validSubscription = (subscription) => {
  if (!subscription || typeof subscription.endpoint !== "string" || subscription.endpoint.length > 2048) return false;
  try {
    const url = new URL(subscription.endpoint);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const host = url.hostname;
    const trusted = host === "fcm.googleapis.com" || host === "updates.push.services.mozilla.com" || host.endsWith(".push.services.mozilla.com") || host.endsWith(".push.apple.com") || host.endsWith(".notify.windows.com");
    return trusted && typeof subscription.keys?.p256dh === "string" && /^[A-Za-z0-9_-]{80,100}$/.test(subscription.keys.p256dh) && typeof subscription.keys?.auth === "string" && /^[A-Za-z0-9_-]{16,32}$/.test(subscription.keys.auth);
  } catch { return false; }
};
router.get("/vapid-key", (_req, res) => res.json({ success: true, publicKey: process.env.VAPID_PUBLIC_KEY || null, enabled: pushConfigured() }));
router.post("/subscribe", protect, asyncHandler(async (req, res) => {
  const { subscription } = req.body;
  if (!validSubscription(subscription)) return res.status(400).json({ success: false, message: "Invalid push subscription" });
  if (!pushConfigured()) return res.status(503).json({ success: false, message: "Push notifications are not configured" });
  const record = { endpoint: subscription.endpoint, keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }, userAgent: String(req.headers["user-agent"] || "").slice(0, 250), createdAt: new Date() };
  await User.updateOne({ _id: req.user._id }, { $pull: { pushSubscriptions: { endpoint: subscription.endpoint } } });
  await User.updateOne({ _id: req.user._id }, { $push: { pushSubscriptions: { $each: [record], $slice: -10 } } });
  res.json({ success: true, message: "Subscribed to push notifications" });
}));
router.post("/unsubscribe", protect, asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  if (typeof endpoint !== "string" || endpoint.length > 2048) return res.status(400).json({ success: false, message: "Invalid subscription endpoint" });
  await User.updateOne({ _id: req.user._id }, { $pull: { pushSubscriptions: { endpoint } } });
  res.json({ success: true, message: "Unsubscribed" });
}));
module.exports = router;
