const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");

// @desc    Get VAPID public key
// @route   GET /api/push/vapid-key
// @access  Public
router.get("/vapid-key", (req, res) => {
  res.json({
    success: true,
    publicKey: process.env.VAPID_PUBLIC_KEY,
  });
});

// @desc    Subscribe to push notifications
// @route   POST /api/push/subscribe
// @access  Private
router.post("/subscribe", protect, async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription",
      });
    }

    const user = await User.findById(req.user._id);

    // Check if this endpoint already exists (don't duplicate)
    const exists = user.pushSubscriptions.some(
      (s) => s.endpoint === subscription.endpoint,
    );

    if (!exists) {
      user.pushSubscriptions.push({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent: req.headers["user-agent"] || "unknown",
      });
      await user.save();
    }

    res.json({
      success: true,
      message: "Subscribed to push notifications",
    });
  } catch (err) {
    console.error("Subscribe error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @desc    Unsubscribe from push notifications
// @route   POST /api/push/unsubscribe
// @access  Private
router.post("/unsubscribe", protect, async (req, res) => {
  try {
    const { endpoint } = req.body;

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { pushSubscriptions: { endpoint } },
    });

    res.json({ success: true, message: "Unsubscribed" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
