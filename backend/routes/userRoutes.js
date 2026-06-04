const express = require("express");
const {
  searchUsers,
  getUserProfile,
  updateProfile,
  blockUser,
  unblockUser,
  getBlockedUsers,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/users/search?q=query
router.get("/search", searchUsers);

// 🔥 NEW: Blocked users routes (must be BEFORE /:username to avoid conflicts)
router.get("/blocked", getBlockedUsers);
router.post("/block/:userId", blockUser);
router.post("/unblock/:userId", unblockUser);

// GET /api/users/profile/:username
router.get("/profile/:username", getUserProfile);

// PUT /api/users/profile
router.put("/profile", updateProfile);

module.exports = router;
