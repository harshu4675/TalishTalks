const express = require("express");
const multer = require("multer");
const {
  searchUsers,
  getUserProfile,
  updateProfile,
  blockUser,
  unblockUser,
  getBlockedUsers,
  uploadAvatar,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// 🔥 Multer - memory storage (no disk, straight to Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// All routes require authentication
router.use(protect);

// GET /api/users/search?q=query
router.get("/search", searchUsers);

// Blocked users routes
router.get("/blocked", getBlockedUsers);
router.post("/block/:userId", blockUser);
router.post("/unblock/:userId", unblockUser);

// 🔥 NEW: Avatar upload
router.post("/avatar", upload.single("avatar"), uploadAvatar);

// GET /api/users/profile/:username
router.get("/profile/:username", getUserProfile);

// PUT /api/users/profile
router.put("/profile", updateProfile);

module.exports = router;
