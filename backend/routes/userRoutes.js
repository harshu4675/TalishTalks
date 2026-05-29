const express = require("express");
const {
  searchUsers,
  getUserProfile,
  updateProfile,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/users/search?q=query
router.get("/search", searchUsers);

// GET /api/users/profile/:username
router.get("/profile/:username", getUserProfile);

// PUT /api/users/profile
router.put("/profile", updateProfile);

module.exports = router;
