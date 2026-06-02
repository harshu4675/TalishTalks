const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { handleUpload } = require("../middleware/uploadMiddleware");
const {
  getMessages,
  sendMessage,
  sendMediaMessage,
  editMessage,
  markSeen,
  deleteForMe,
  deleteForEveryone,
  searchMessages,
} = require("../controllers/messageController");

router.get("/search", protect, searchMessages);
router.get("/:chatId", protect, getMessages);
router.post("/send", protect, sendMessage);
router.post("/send-media", protect, handleUpload, sendMediaMessage); // 🔥 NEW
router.put("/:messageId/edit", protect, editMessage); // 🔥 NEW
router.put("/:chatId/seen", protect, markSeen);
router.delete("/:messageId/me", protect, deleteForMe);
router.delete("/:messageId/everyone", protect, deleteForEveryone);

module.exports = router;
